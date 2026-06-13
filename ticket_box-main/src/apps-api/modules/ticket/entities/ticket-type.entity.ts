import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ticket_types')
export class TicketType {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  concert_id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string; // 'SVIP', 'VIP', 'CAT1', 'CAT2', 'GA'

  @Column({ type: 'numeric' })
  price: number;

  @Column({ type: 'integer' })
  total_quantity: number;

  @Column({ type: 'integer' })
  remaining_quantity: number;
}
