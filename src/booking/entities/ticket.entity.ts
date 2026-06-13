import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';
import { Concert } from '../../info/entities/concert.entity';
import { SeatInventory } from './seat-inventory.entity';
import { ZoneInventory } from './zone-inventory.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  concert_id: number;

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

  @ManyToOne(() => Concert)
  @JoinColumn({ name: 'concert_id' })
  concert: Concert;

  @ManyToOne(() => SeatInventory)
  @JoinColumn([
    { name: 'seatNo', referencedColumnName: 'seatNo' },
    { name: 'concert_id', referencedColumnName: 'concert_id' }
  ])
  seat: SeatInventory;

  @ManyToOne(() => ZoneInventory)
  @JoinColumn([
    { name: 'zone', referencedColumnName: 'zone' },
    { name: 'concert_id', referencedColumnName: 'concert_id' }
  ])
  zoneInfo: ZoneInventory;
}
