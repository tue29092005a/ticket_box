import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from './ticket.entity';
import { Concert } from '../../info/entities/concert.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  concert_id: number;

  @Column('decimal')
  totalAmount: number;

  @Column({ default: 'PAID' })
  status: string;

  @OneToMany(() => Ticket, ticket => ticket.invoice, { cascade: true })
  tickets: Ticket[];

  @ManyToOne(() => Concert)
  @JoinColumn({ name: 'concert_id' })
  concert: Concert;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
