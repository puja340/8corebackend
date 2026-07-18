import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  genset_id: number;

  @Column('numeric', { precision: 8, scale: 2 })
  voltage: number;

  @Column('numeric', { precision: 6, scale: 2 })
  frequency: number;

  @Column('numeric', { precision: 12, scale: 2 })
  running_time: number;

  @Column()
  engine_rpm: number;

  @Column('numeric', { precision: 6, scale: 2 })
  lube_oil: number;

  @Column('numeric', { precision: 6, scale: 2 })
  coolant_temp: number;

  @Column({ type: 'timestamptz' })
  created_at: Date;
}