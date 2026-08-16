import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Shift } from './shift.entity';
import { Skill } from './skill.entity';

@Entity('shift_requirements')
@Unique(['shiftId', 'skillId'])
export class ShiftRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  shiftId: string;

  @ManyToOne(() => Shift, (s) => s.requirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shiftId' })
  shift: Shift;

  @Column({ type: 'uuid' })
  skillId: string;

  @ManyToOne(() => Skill, (s) => s.shiftRequirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skillId' })
  skill: Skill;

  @Column({ type: 'int', default: 1 })
  requiredCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
