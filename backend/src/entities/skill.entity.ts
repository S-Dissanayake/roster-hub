import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkerSkill } from './worker-skill.entity';
import { ShiftRequirement } from './shift-requirement.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => WorkerSkill, (ws) => ws.skill)
  workerSkills: WorkerSkill[];

  @OneToMany(() => ShiftRequirement, (sr) => sr.skill)
  shiftRequirements: ShiftRequirement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
