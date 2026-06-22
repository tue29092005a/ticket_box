import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ConcertStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('concerts')
@Index('idx_concerts_status', ['status'])
@Index('idx_concerts_slug', ['slug'])
export class Concert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organizer_id: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  slug: string;

  @Column({ type: 'timestamp', nullable: true })
  performanceDate: Date;

  @Column({ type: 'varchar', length: 20, default: ConcertStatus.DRAFT })
  status: string;

  @Column({ type: 'smallint', default: 1 })
  current_step: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
