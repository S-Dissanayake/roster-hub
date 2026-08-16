import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { WorkerSkill } from './worker-skill.entity';
import { WorkerAvailability } from './worker-availability.entity';
import { ShiftAssignment } from './shift-assignment.entity';

export enum WorkerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('workers')
export class Worker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @OneToOne(() => User, (user) => user.worker, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: WorkerStatus,
    enumName: 'worker_status_enum',
    default: WorkerStatus.ACTIVE,
  })
  status: WorkerStatus;

  @OneToMany(() => WorkerSkill, (ws) => ws.worker)
  workerSkills: WorkerSkill[];

  @OneToMany(() => WorkerAvailability, (wa) => wa.worker)
  availabilities: WorkerAvailability[];

  @OneToMany(() => ShiftAssignment, (sa) => sa.worker)
  assignments: ShiftAssignment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
