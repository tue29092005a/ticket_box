import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('concerts')
export class Concert {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column()
  name: string;

  @Column({ type: 'timestamp' })
  performanceDate: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ default: 'UPCOMING' })
  status: string;
}
