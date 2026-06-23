import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as amqp from 'amqplib';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const csvParser = require('csv-parser');
import Redis from 'ioredis';
import { ImportJob, ImportJobStatus, ImportRowError } from '../../guest/entities/import-job.entity';
import { SeatInventory, SeatStatus } from '../../booking/entities/seat-inventory.entity';
import { Ticket } from '../../booking/entities/ticket.entity';
import { RABBITMQ_CHANNEL } from '../../config/rabbitmq.config';
import { REDIS_CLIENT } from '../../config/redis.config';

// ── Folder paths (relative to project root) ──────────────────────────────────
const INBOX_DIR   = path.join(process.cwd(), 'uploads', 'VIP_CSV', 'inbox');
const ARCHIVE_DIR = path.join(process.cwd(), 'uploads', 'VIP_CSV', 'archived');
const ERROR_DIR   = path.join(process.cwd(), 'uploads', 'VIP_CSV', 'error');

interface ImportPayload {
  jobId: string;
  filePath: string; // filename only, relative to INBOX_DIR
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
  ) {}

  async onModuleInit() {
    // vip_guest.import is already asserted in rabbitmq.config.ts on startup
    // Process one file at a time — prevents DB thrash and overlapping locks
    await this.rabbitChannel.prefetch(1);

    this.logger.log('GuestImportProcessor: listening on vip_guest.import [prefetch=1]');

    this.rabbitChannel.consume(
      'vip_guest.import',
      async (msg) => { if (msg) await this.handleMessage(msg); },
      { noAck: false },
    );
  }

  // ── Message handler ─────────────────────────────────────────────────────────

  private async handleMessage(msg: amqp.ConsumeMessage) {
    const payload: ImportPayload = JSON.parse(msg.content.toString());
    const { jobId, filePath, showId, sponsorId } = payload;

    // 3.2 — Distributed lock (30-min TTL) — one job per show+sponsor at a time
    const lockKey = `lock:vip_import:${showId}:${sponsorId}`;
    // Acquire lock: SET key value NX EX 1800
    // ioredis overloads: use array form for NX + EX together
    const lockResult = await this.redis.set(lockKey, jobId, 'EX', 1800, 'NX');
    const acquired = lockResult === 'OK';
    if (!acquired) {
      this.logger.warn(
        `[${jobId}] Lock held for show=${showId} sponsor=${sponsorId} — requeuing.`,
      );
      // Requeue; the consumer will pick it up again after processing the current file
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

      // 3.3–3.5 — Stream, validate, upsert
      const { successCount, errorCount, errorDetails, totalRows } =
        await this.processFile(filePath, showId, sponsorId, jobId);

      // 3.6 — Archive the file
      this.moveFile(filePath, INBOX_DIR, ARCHIVE_DIR);

      // Update job to COMPLETED
      await this.importJobRepo.update(jobId, {
        status: ImportJobStatus.COMPLETED,
        totalRows,
        successCount,
        errorCount,
        errorDetails,
        completedAt: new Date(),
      });

      this.logger.log(
        `[${jobId}] COMPLETED — success=${successCount} errors=${errorCount} total=${totalRows}`,
      );

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
      this.moveFile(filePath, INBOX_DIR, ERROR_DIR);
      await this.importJobRepo.update(jobId, {
        status: ImportJobStatus.FAILED,
        completedAt: new Date(),
      });
      // 3.7 — NACK without requeue → RabbitMQ routes to DLQ after retry limit
      this.rabbitChannel.nack(msg, false, false);

    } finally {
      await this.redis.del(lockKey);
    }
  }

  // ── CSV processing ──────────────────────────────────────────────────────────

  private processFile(
    filePath: string,
    showId: string,
    sponsorId: string,
    jobId: string,
  ): Promise<{
    successCount: number;
    errorCount: number;
    errorDetails: ImportRowError[];
    totalRows: number;
  }> {
    return new Promise((resolve, reject) => {
      const fullPath = path.join(INBOX_DIR, filePath);

      if (!fs.existsSync(fullPath)) {
        return reject(new Error(`CSV file not found at: ${fullPath}`));
      }

      // 3.3 — Auto-detect delimiter (comma vs European semicolon)
      const firstLine = fs.readFileSync(fullPath, 'utf8').split('\n')[0];
      const separator = firstLine.includes(';') ? ';' : ',';

      const errors: ImportRowError[] = [];
      let successCount = 0;
      let rowIndex = 0;

      // Collect all async row operations so we can await them before resolving
      const rowPromises: Promise<void>[] = [];

      fs.createReadStream(fullPath)
        .pipe(
          csvParser({
            separator,
            // 3.3 — Strip BOM from header names
            mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim(),
            mapValues:  ({ value })  => value.trim(),
          }),
        )
        .on('data', (row: Record<string, string>) => {
          rowIndex++;
          const currentRow = rowIndex;
          rowPromises.push(this.processRow(row, currentRow, showId, sponsorId, jobId, errors)
            .then((ok) => { if (ok) successCount++; })
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
   * 3.4 — Validate one row, look up the seat by sponsorId, and UPSERT the ticket.
   * Returns true on success, false on any row-level error (errors are appended in-place).
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
      // Look up seat
      const seat = await this.seatRepo.findOne({
        where: { row: seatRow, number: seatNum, showId },
      });

      if (!seat) {
        errors.push({ row: rowIndex, seatNo, reason: `Seat ${seatNo} not found for show ${showId}` });
        return false;
      }

      // Guard: seat must be pre-allocated to this sponsor
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

      // UPSERT into tickets — conflict on (showId, seatNo) combination
      await this.ticketRepo
        .createQueryBuilder()
        .insert()
        .into(Ticket)
        .values({
          showId,
          seatNo,
          zone: 'SVIP',
          price: 0,            // VIP guests don't pay — price is handled separately
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

      // Mark seat as SOLD so it can't be double-booked by regular users
      await this.seatRepo.update(seat.seatId, { status: SeatStatus.SOLD });

      this.logger.debug(`[Row ${rowIndex}] OK — seat=${seatNo} guest=${name} <${email}>`);
      return true;

    } catch (err) {
      // 3.5 — Per-row error: log it and continue the batch
      errors.push({ row: rowIndex, seatNo, reason: err.message });
      return false;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private moveFile(filename: string, srcDir: string, destDir: string) {
    const src  = path.join(srcDir, filename);
    const dest = path.join(destDir, filename);
    try {
      if (fs.existsSync(src)) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(src, dest);
        this.logger.log(`Moved '${filename}' → ${destDir}`);
      }
    } catch (err) {
      this.logger.error(`Failed to move file '${filename}': ${err.message}`);
    }
  }
}
