import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Shift } from './shift.entity';
import { Worker } from './worker.entity';

export enum AssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('shift_assignments')
@Unique(['shiftId', 'workerId'])
@Index(['workerId', 'status'])
export class ShiftAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shiftId: string;

  @ManyToOne(() => Shift, (s) => s.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => Worker, (w) => w.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: Worker;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    enumName: 'assignment_status_enum',
    default: AssignmentStatus.PENDING,
  })
  status: AssignmentStatus;

  @CreateDateColumn()
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
