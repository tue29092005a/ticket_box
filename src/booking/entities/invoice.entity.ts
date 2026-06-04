import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  showId: string;

  @Column('decimal')
  totalAmount: number;

  @Column({ default: 'PAID' })
  status: string;

  @OneToMany(() => Ticket, ticket => ticket.invoice, { cascade: true })
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;
}
