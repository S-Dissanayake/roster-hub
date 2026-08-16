import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from '../entities/shift.entity';
import { ShiftRequirement } from '../entities/shift-requirement.entity';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { Participant } from '../entities/participant.entity';
import { Skill } from '../entities/skill.entity';
import { Worker } from '../entities/worker.entity';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { EligibilityModule } from '../eligibility/eligibility.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftRequirement, ShiftAssignment, Participant, Skill, Worker]),
    EligibilityModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
