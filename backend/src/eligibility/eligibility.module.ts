import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Worker } from '../entities/worker.entity';
import { Shift } from '../entities/shift.entity';
import { ShiftAssignment } from '../entities/shift-assignment.entity';
import { EligibilityService } from './eligibility.service';
import { EligibilityController } from './eligibility.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Worker, Shift, ShiftAssignment])],
  controllers: [EligibilityController],
  providers: [EligibilityService],
  exports: [EligibilityService],
})
export class EligibilityModule {}
