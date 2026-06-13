import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Concert } from '../../info/entities/concert.entity';

@Entity('zone_inventory')
export class ZoneInventory {
  @PrimaryColumn()
  zone: string; // 'VIP' | 'Normal'

  @PrimaryColumn()
  concert_id: number;

  @ManyToOne(() => Concert)
  @JoinColumn({ name: 'concert_id' })
  concert: Concert;

  @Column('int')
  totalCapacity: number;

  @Column('int')
  availableSlots: number;

  @Column({ type: 'int', default: 0 })
  price: number;
}
