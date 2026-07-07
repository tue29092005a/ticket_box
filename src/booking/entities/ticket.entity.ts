import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('tickets')
@Unique(['showId', 'seatNo'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  showId: string;

  @Column({ nullable: true })
  seatNo: string; // for SVIP

  @Column({ nullable: true })
  zone: string; // for VIP / Normal

  @Column('decimal')
  price: number;

  @Column({ nullable: true })
  qrCodeUrl: string;

  // ── VIP Guest CSV Import fields ──────────────────────────────────────────
  /** Full name of the VIP guest — populated by CSV import worker */
  @Column({ type: 'varchar', length: 255, nullable: true })
  guestName: string | null;

  /** Email of the VIP guest — populated by CSV import worker */
  @Column({ type: 'varchar', length: 255, nullable: true })
  guestEmail: string | null;

  /** Which sponsor's CSV import created this ticket */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sponsorId: string | null;

  /** FK to import_jobs.id — which batch import produced this ticket */
  @Column({ type: 'uuid', nullable: true })
  importJobId: string | null;
  // ────────────────────────────────────────────────────────────────────────

  @ManyToOne(() => Invoice, invoice => invoice.tickets)
  invoice: Invoice;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

