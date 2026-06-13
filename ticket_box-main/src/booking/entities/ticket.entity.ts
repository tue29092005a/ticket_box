import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('tickets')
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

  @ManyToOne(() => Invoice, invoice => invoice.tickets)
  invoice: Invoice;
}
