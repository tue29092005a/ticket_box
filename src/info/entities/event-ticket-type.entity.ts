import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('event_ticket_types')
@Index('idx_event_ticket_types_show', ['showId'])
export class EventTicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  showId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 0 })
  price: number;

  @Column({ type: 'boolean', default: false })
  is_free: boolean;

  @Column({ type: 'int' })
  total_quantity: number;

  @Column({ type: 'int', default: 1 })
  min_per_order: number;

  @Column({ type: 'int', default: 10 })
  max_per_order: number;

  @Column({ type: 'timestamp', nullable: true })
  sale_start: Date;

  @Column({ type: 'timestamp', nullable: true })
  sale_end: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ticket_image_url: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
