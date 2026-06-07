import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('seat_inventory')
export class SeatInventory {
  @PrimaryColumn()
  seatNo: string;

  @PrimaryColumn()
  showId: string;

  @Column({ default: 'AVAILABLE' })
  status: string; // AVAILABLE | RESERVED | BOOKED

  @Column({ nullable: true, default: 'SVIP' })
  zone: string;

  @Column({ nullable: true })
  reservedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  expiryTime: Date;
}
