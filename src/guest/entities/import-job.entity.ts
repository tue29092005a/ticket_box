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

  /** Filename (relative to uploads/VIP_CSV/inbox/) */
  @Column({ type: 'varchar', length: 500 })
  filePath: string;

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
   * SHA256(filePath + showId + sponsorId) — prevents duplicate processing
   * of the same file for the same show+sponsor combination.
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
