import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Participant } from './participant.entity';
import { ShiftRequirement } from './shift-requirement.entity';
import { ShiftAssignment } from './shift-assignment.entity';

export enum ShiftStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('shifts')
@Index(['date'])
@Index(['date', 'status'])
@Index(['participantId'])
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  participantId: string;

  @ManyToOne(() => Participant, (p) => p.shifts, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'time' })
  startTime: string; // HH:mm:ss

  @Column({ type: 'time' })
  endTime: string; // HH:mm:ss

  @Column({
    type: 'enum',
    enum: ShiftStatus,
    enumName: 'shift_status_enum',
    default: ShiftStatus.DRAFT,
  })
  status: ShiftStatus;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => ShiftRequirement, (sr) => sr.shift)
  requirements: ShiftRequirement[];

  @OneToMany(() => ShiftAssignment, (sa) => sa.shift)
  assignments: ShiftAssignment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
