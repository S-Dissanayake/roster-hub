import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Worker } from './worker.entity';

@Entity('worker_availabilities')
@Index(['workerId', 'dayOfWeek'])
export class WorkerAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => Worker, (w) => w.availabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: Worker;

  @Column({ type: 'int' })
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday)

  @Column({ type: 'time' })
  startTime: string; // HH:mm:ss

  @Column({ type: 'time' })
  endTime: string; // HH:mm:ss

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
