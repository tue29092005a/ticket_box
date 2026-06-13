import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Concert } from '../../info/entities/concert.entity';
import { ZoneInventory } from './zone-inventory.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('seat_inventory')
export class SeatInventory {
  @PrimaryColumn()
  seatNo: string;

  @PrimaryColumn()
  concert_id: number;

  @Column({ nullable: true, default: 'SVIP' })
  zone: string;

  @Column({ default: 'AVAILABLE' })
  status: string; // AVAILABLE | RESERVED | BOOKED

  @Column({ nullable: true })
  reservedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  expiryTime: Date;

  @ManyToOne(() => Concert)
  @JoinColumn({ name: 'concert_id' })
  concert: Concert;

  @ManyToOne(() => ZoneInventory)
  @JoinColumn([
    { name: 'zone', referencedColumnName: 'zone' },
    { name: 'concert_id', referencedColumnName: 'concert_id' }
  ])
  zoneInfo: ZoneInventory;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reservedBy' })
  user: User;
}
