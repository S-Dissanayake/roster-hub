import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Participant } from './participant.entity';
import { Worker } from './worker.entity';

@Entity('participant_preferences')
export class ParticipantPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  participantId: string;

  @ManyToOne(() => Participant, (p) => p.preferences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  @Column({ type: 'uuid', nullable: true })
  preferredWorkerId: string;

  @ManyToOne(() => Worker, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'preferredWorkerId' })
  preferredWorker: Worker;

  @Column({ nullable: true })
  preferredGender: string;

  @Column({ nullable: true })
  preferredLanguage: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
