import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import * as amqp from 'amqplib';
import { ImportJob, ImportJobStatus } from './entities/import-job.entity';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.config';

export const VIP_IMPORT_QUEUE = 'vip_guest.import';

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(
    @InjectRepository(ImportJob)
    private readonly importJobRepo: Repository<ImportJob>,
    @Inject(RABBITMQ_CHANNEL) private readonly rabbitChannel: amqp.Channel,
  ) {}

  /**
   * Validates idempotency, persists the import_jobs record, and publishes
   * to RabbitMQ. Returns immediately with 202 — the worker handles the rest.
   */
  async enqueueImport(filePath: string, showId: string, sponsorId: string) {
    const idempotencyKey = createHash('sha256')
      .update(`${filePath}${showId}${sponsorId}`)
      .digest('hex');

    // Guard: same file for same show+sponsor is only processed once
    const existing = await this.importJobRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      throw new ConflictException({
        message: 'This file has already been queued for this show and sponsor.',
        job_id: existing.id,
        status: existing.status,
      });
    }

    const job = this.importJobRepo.create({
      filePath,
      showId,
      sponsorId,
      idempotencyKey,
      status: ImportJobStatus.PENDING,
    });
    await this.importJobRepo.save(job);

    this.rabbitChannel.sendToQueue(
      VIP_IMPORT_QUEUE,
      Buffer.from(JSON.stringify({ jobId: job.id, filePath, showId, sponsorId })),
      { persistent: true },
    );

    this.logger.log(`Import job ${job.id} queued for sponsor=${sponsorId}, show=${showId}, file=${filePath}`);
    return { message: 'Import task queued successfully', job_id: job.id };
  }

  /** Returns current job status plus all per-row error details. */
  async getJobStatus(id: string) {
    const job = await this.importJobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Import job '${id}' not found`);

    return {
      id:           job.id,
      filePath:     job.filePath,
      showId:       job.showId,
      sponsorId:    job.sponsorId,
      status:       job.status,
      totalRows:    job.totalRows,
      successCount: job.successCount,
      errorCount:   job.errorCount,
      errorDetails: job.errorDetails,
      startedAt:    job.startedAt,
      completedAt:  job.completedAt,
      createdAt:    job.createdAt,
    };
  }

  /** List all jobs (admin overview). Ordered newest first. */
  async listJobs(showId?: string) {
    const where = showId ? { showId } : {};
    return this.importJobRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
