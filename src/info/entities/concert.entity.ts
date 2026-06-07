import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('concerts')
export class Concert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  showId: string;

  @Column()
  name: string;

  @Column({ type: 'timestamp' })
  performanceDate: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ default: 'UPCOMING' })
  status: string;
}
