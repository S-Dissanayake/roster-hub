import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerSkill } from '../entities/worker-skill.entity';
import { Worker } from '../entities/worker.entity';
import { Skill } from '../entities/skill.entity';
import { WorkerSkillsService } from './worker-skills.service';
import { WorkerSkillsController } from './worker-skills.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkerSkill, Worker, Skill])],
  controllers: [WorkerSkillsController],
  providers: [WorkerSkillsService],
  exports: [WorkerSkillsService],
})
export class WorkerSkillsModule {}
