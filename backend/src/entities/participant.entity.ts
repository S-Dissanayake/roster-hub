import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ParticipantPreference } from './participant-preference.entity';
import { Shift } from './shift.entity';

export enum ParticipantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('participants')
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  phone: string;

  @Column()
  address: string;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    enumName: 'participant_status_enum',
    default: ParticipantStatus.ACTIVE,
  })
  status: ParticipantStatus;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => ParticipantPreference, (pp) => pp.participant)
  preferences: ParticipantPreference[];

  @OneToMany(() => Shift, (s) => s.participant)
  shifts: Shift[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
