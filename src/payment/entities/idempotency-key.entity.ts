import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Concert } from '../../info/entities/concert.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('idempotency_keys')
@Index('idx_idempotency_key_unique', ['key'], { unique: true })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  userId: string;

  @Column({ default: 'PENDING' })
  status: string; // 'PENDING' | 'COMPLETED' | 'FAILED'

  @Column({ type: 'jsonb', nullable: true })
  responsePayload: any;

  @Column({ type: 'jsonb', nullable: true })
  requestPayload: any;

  @Column({ nullable: true })
  paypalOrderId: string;

  @Column()
  concert_id: number;

  @ManyToOne(() => Concert)
  @JoinColumn({ name: 'concert_id' })
  concert: Concert;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
}
