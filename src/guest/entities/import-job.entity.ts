import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ImportJobStatus {
  PENDING    = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED  = 'COMPLETED',
  FAILED     = 'FAILED',
}

export interface ImportRowError {
  row: number;
  seatNo: string;
  reason: string;
}

/**
 * Tracks each VIP CSV import job — one record per file upload trigger.
 * Status lifecycle: PENDING → PROCESSING → COMPLETED | FAILED
 */
@Entity('import_jobs')
export class ImportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * MinIO object key in the ticketbox-csv-imports bucket.
   * Format: {showId}/{sponsorId}_{timestamp_ms}.csv
   *
   * @deprecated filePath column renamed to fileKey in MinIO migration (2026-07-04).
   * Migration SQL: ALTER TABLE import_jobs RENAME COLUMN "filePath" TO "fileKey";
   */
  @Column({ name: 'fileKey', type: 'varchar', length: 500 })
  fileKey: string;

  @Column({ type: 'uuid' })
  showId: string;

  /** Which sponsor triggered this import */
  @Column({ type: 'varchar', length: 100 })
  sponsorId: string;

  @Column({ type: 'varchar', length: 20, default: ImportJobStatus.PENDING })
  status: ImportJobStatus;

  @Column({ type: 'int', default: 0 })
  totalRows: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  errorCount: number;

  /** Per-row error details — populated by the worker */
  @Column({ type: 'jsonb', default: [] })
  errorDetails: ImportRowError[];

  /**
   * SHA256(fileKey + showId + sponsorId) — prevents duplicate processing
   * of the same file for the same show+sponsor combination.
   * Note: fileKey includes a ms timestamp, so re-uploading the same CSV
   * produces a new key and a new import job — this is intentional.
   */
  @Column({ type: 'varchar', length: 64, unique: true })
  idempotencyKey: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
