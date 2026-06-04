import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Show {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  showId: string;

  @Column()
  name: string;

  @Column({ type: 'timestamp' })
  timeStart: Date;

  @Column({ type: 'timestamp' })
  timeEnd: Date;

  @Column()
  location: string;

  @Column()
  status: string;
}
