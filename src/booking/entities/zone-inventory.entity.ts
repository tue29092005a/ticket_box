import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('zone_inventory')
export class ZoneInventory {
  @PrimaryColumn()
  zone: string; // 'VIP' | 'Normal'

  @PrimaryColumn()
  showId: string;

  @Column('int')
  totalCapacity: number;

  @Column('int')
  availableSlots: number;

  @Column({ type: 'int', default: 0 })
  price: number;
}
