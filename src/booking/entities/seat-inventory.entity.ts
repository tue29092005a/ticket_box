import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  LOCKED = 'LOCKED',
}

@Entity('seat_inventory')
@Index('idx_seat_inventory_lookup', ['showId', 'zone', 'status'])
export class SeatInventory {
  @PrimaryGeneratedColumn('uuid')
  seatId: string;

  @Column({ type: 'uuid' })
  showId: string;

  @Column({ type: 'varchar', length: 100 })
  zone: string; // Maps to EventTicketType.name

  @Column({ type: 'varchar', length: 50, nullable: true })
  row: string; // Only for seated events

  @Column({ type: 'varchar', length: 50, nullable: true })
  number: string; // Only for seated events

  @Column({ type: 'varchar', length: 20, default: SeatStatus.AVAILABLE })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  reservedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  expiryTime: Date;

  /**
   * Sponsor allocation — NULL means a normal public seat.
   * When set (e.g. 'sponsor-abc'), the seat is pre-reserved for that
   * sponsor's VIP CSV import. Multiple sponsors can coexist in the same show.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sponsorId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
