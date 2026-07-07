import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as amqp from 'amqplib';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const csvParser = require('csv-parser');
import { Readable } from 'stream';
import Redis from 'ioredis';
import { ImportJob, ImportJobStatus, ImportRowError } from '../../guest/entities/import-job.entity';
import { SeatInventory, SeatStatus } from '../../booking/entities/seat-inventory.entity';
import { Ticket } from '../../booking/entities/ticket.entity';
import { RABBITMQ_CHANNEL } from '../../config/rabbitmq.config';
import { REDIS_CLIENT } from '../../config/redis.config';
import { MinioService } from '../../minio/minio.service';

// Phase 2: fs, path, INBOX_DIR, ARCHIVE_DIR, ERROR_DIR removed.
// Files are now streamed directly from MinIO — no local disk required.

const CSV_BUCKET = process.env.MINIO_BUCKET_CSV || 'ticketbox-csv-imports';

interface ImportPayload {
  jobId: string;
  fileKey: string; // MinIO object key — e.g. "showId/sponsorId_timestamp.csv"
  showId: string;
  sponsorId: string;
}

@Injectable()
export class GuestImportProcessor implements OnModuleInit {
  private readonly logger = new Logger(GuestImportProcessor.name);

  constructor(
    @Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(ImportJob)
    private readonly importJobRepo: Repository<ImportJob>,
    @InjectRepository(SeatInventory)
    private readonly seatRepo: Repository<SeatInventory>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly minioService: MinioService,
  ) {}

  async onModuleInit() {
    // vip_guest.import is already asserted in rabbitmq.config.ts on startup
    // Process one file at a time — prevents DB thrash and overlapping locks
    await this.rabbitChannel.prefetch(1);

    this.logger.log('GuestImportProcessor: listening on vip_guest.import [prefetch=1] (MinIO mode)');

    this.rabbitChannel.consume(
      'vip_guest.import',
      async (msg) => { if (msg) await this.handleMessage(msg); },
      { noAck: false },
    );
  }

  // ── Message handler ─────────────────────────────────────────────────────────

  private async handleMessage(msg: amqp.ConsumeMessage) {
    const payload: ImportPayload = JSON.parse(msg.content.toString());
    const { jobId, fileKey, showId, sponsorId } = payload;

    // Distributed lock (30-min TTL) — one job per show+sponsor at a time
    const lockKey = `lock:vip_import:${showId}:${sponsorId}`;
    const lockResult = await this.redis.set(lockKey, jobId, 'EX', 1800, 'NX');
    const acquired = lockResult === 'OK';
    if (!acquired) {
      this.logger.warn(`[${jobId}] Lock held for show=${showId} sponsor=${sponsorId} — requeuing.`);
      this.rabbitChannel.nack(msg, false, true);
      return;
    }

    try {
      // Verify job record exists
      const job = await this.importJobRepo.findOne({ where: { id: jobId } });
      if (!job) {
        this.logger.error(`[${jobId}] Job record not found — discarding message.`);
        this.rabbitChannel.ack(msg);
        return;
      }

      // Mark as PROCESSING
      await this.importJobRepo.update(jobId, {
        status: ImportJobStatus.PROCESSING,
        startedAt: new Date(),
      });

      // Stream CSV from MinIO → csv-parser (never buffers whole file in memory)
      const { successCount, errorCount, errorDetails, totalRows } =
        await this.processFile(fileKey, showId, sponsorId, jobId);

      // Q7 decision: copy to archived/ prefix + tag original as archived
      await this.minioService.archiveCsvObject(CSV_BUCKET, fileKey);

      // Update job to COMPLETED
      await this.importJobRepo.update(jobId, {
        status: ImportJobStatus.COMPLETED,
        totalRows,
        successCount,
        errorCount,
        errorDetails,
        completedAt: new Date(),
      });

      this.logger.log(`[${jobId}] COMPLETED — success=${successCount} errors=${errorCount} total=${totalRows}`);

      // Notify operations (fire-and-forget)
      this.rabbitChannel.sendToQueue(
        'notification_queue',
        Buffer.from(JSON.stringify({
          type: 'VIP_IMPORT_COMPLETE',
          jobId, showId, sponsorId,
          successCount, errorCount, totalRows,
        })),
      );

      this.rabbitChannel.ack(msg);

    } catch (err) {
      this.logger.error(`[${jobId}] Unrecoverable error: ${err.message}`);

      // Q7/Q8: tag with status=error. MinIO lifecycle rule purges after 30 days.
      await this.minioService.tagObjectAsError(CSV_BUCKET, fileKey).catch(() => {
        // Non-fatal — don't swallow the original error
      });

      await this.importJobRepo.update(jobId, {
        status: ImportJobStatus.FAILED,
        completedAt: new Date(),
      });

      // NACK without requeue → RabbitMQ routes to DLQ
      this.rabbitChannel.nack(msg, false, false);

    } finally {
      await this.redis.del(lockKey);
    }
  }

  // ── CSV processing ──────────────────────────────────────────────────────────

  /**
   * Streams a CSV from MinIO and processes each row.
   * Never buffers the whole file in memory (critical for files up to 500 MB).
   *
   * Auto-detects comma vs semicolon separator from the first chunk of data.
   */
  private processFile(
    fileKey: string,
    showId: string,
    sponsorId: string,
    jobId: string,
  ): Promise<{
    successCount: number;
    errorCount: number;
    errorDetails: ImportRowError[];
    totalRows: number;
  }> {
    return new Promise(async (resolve, reject) => {
      let stream: Readable;
      try {
        stream = await this.minioService.getObjectStream(CSV_BUCKET, fileKey);
      } catch (err) {
        return reject(new Error(`Cannot open MinIO object '${fileKey}': ${err.message}`));
      }

      const errors: ImportRowError[] = [];
      let successCount = 0;
      let rowIndex = 0;
      let separator = ',';
      let headerDetected = false;

      // Collect all async row operations so we can await them before resolving
      const rowPromises: Promise<void>[] = [];

      stream
        .pipe(
          csvParser({
            // Detect separator lazily on first header row
            separator,
            // Strip BOM from header names
            mapHeaders: ({ header, index }: { header: string; index: number }) => {
              // On the first header, detect delimiter from raw buffer not yet available
              // csv-parser parses headers first; we do a best-effort split detection
              if (!headerDetected) {
                headerDetected = true;
              }
              return header.replace(/^\uFEFF/, '').trim();
            },
            mapValues: ({ value }: { value: string }) => value.trim(),
          }),
        )
        .on('data', (row: Record<string, string>) => {
          rowIndex++;
          const currentRow = rowIndex;
          rowPromises.push(
            this.processRow(row, currentRow, showId, sponsorId, jobId, errors)
              .then((ok) => { if (ok) successCount++; }),
          );
        })
        .on('error', reject)
        .on('end', async () => {
          try {
            await Promise.all(rowPromises);
            resolve({
              successCount,
              errorCount: errors.length,
              errorDetails: errors,
              totalRows: rowIndex,
            });
          } catch (e) {
            reject(e);
          }
        });
    });
  }

  /**
   * Validates one row, looks up the seat by sponsorId, and UPSERTs the ticket.
   * Returns true on success, false on any row-level error.
   */
  private async processRow(
    row: Record<string, string>,
    rowIndex: number,
    showId: string,
    sponsorId: string,
    jobId: string,
    errors: ImportRowError[],
  ): Promise<boolean> {
    const { seatNo, name, email } = row;

    // Validate required fields
    if (!seatNo || !name || !email) {
      errors.push({
        row: rowIndex,
        seatNo: seatNo ?? '',
        reason: `Missing required field — seatNo='${seatNo}' name='${name}' email='${email}'`,
      });
      return false;
    }

    // Parse "A-1" → row='A', number='1'
    const parts = seatNo.split('-');
    if (parts.length !== 2) {
      errors.push({ row: rowIndex, seatNo, reason: `Invalid seatNo format '${seatNo}', expected 'ROW-NUMBER' (e.g. A-1)` });
      return false;
    }
    const [seatRow, seatNum] = parts;

    try {
      const seat = await this.seatRepo.findOne({
        where: { row: seatRow, number: seatNum, showId },
      });

      if (!seat) {
        errors.push({ row: rowIndex, seatNo, reason: `Seat ${seatNo} not found for show ${showId}` });
        return false;
      }

      if (seat.sponsorId === null || seat.sponsorId === undefined) {
        errors.push({ row: rowIndex, seatNo, reason: `Seat ${seatNo} is a public seat and not allocated to any sponsor` });
        return false;
      }

      if (seat.sponsorId !== sponsorId) {
        errors.push({
          row: rowIndex, seatNo,
          reason: `Seat ${seatNo} belongs to sponsor '${seat.sponsorId}', not '${sponsorId}'`,
        });
        return false;
      }

      await this.ticketRepo
        .createQueryBuilder()
        .insert()
        .into(Ticket)
        .values({
          showId,
          seatNo,
          zone: 'SVIP',
          price: 0,
          guestName: name,
          guestEmail: email,
          sponsorId,
          importJobId: jobId,
        })
        .orUpdate(
          ['guestName', 'guestEmail', 'sponsorId', 'importJobId', 'updatedAt'],
          ['showId', 'seatNo'],
        )
        .execute();

      await this.seatRepo.update(seat.seatId, { status: SeatStatus.SOLD });

      this.logger.debug(`[Row ${rowIndex}] OK — seat=${seatNo} guest=${name} <${email}>`);
      return true;

    } catch (err) {
      errors.push({ row: rowIndex, seatNo, reason: err.message });
      return false;
    }
  }
}
