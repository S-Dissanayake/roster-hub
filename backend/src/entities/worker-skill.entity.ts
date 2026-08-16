import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Worker } from './worker.entity';
import { Skill } from './skill.entity';

@Entity('worker_skills')
@Unique(['workerId', 'skillId'])
@Index(['workerId'])
@Index(['skillId'])
export class WorkerSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => Worker, (worker) => worker.workerSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker: Worker;

  @Column({ type: 'uuid' })
  skillId: string;

  @ManyToOne(() => Skill, (skill) => skill.workerSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skillId' })
  skill: Skill;

  @CreateDateColumn()
  createdAt: Date;
}
