import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerSkill } from '../entities/worker-skill.entity';
import { Worker } from '../entities/worker.entity';
import { Skill } from '../entities/skill.entity';
import { CreateWorkerSkillDto } from './dto/create-worker-skill.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class WorkerSkillsService {
  constructor(
    @InjectRepository(WorkerSkill)
    private readonly workerSkillRepository: Repository<WorkerSkill>,
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async assign(workerId: string, dto: CreateWorkerSkillDto, currentUser: AuthenticatedUser): Promise<WorkerSkill> {
    const worker = await this.workerRepository.findOne({ where: { id: workerId } });
    if (!worker) {
      throw new NotFoundException(`Worker with ID '${workerId}' not found`);
    }

    const skill = await this.skillRepository.findOne({ where: { id: dto.skillId } });
    if (!skill) {
      throw new NotFoundException(`Skill with ID '${dto.skillId}' not found`);
    }

    const existing = await this.workerSkillRepository.findOne({ where: { workerId, skillId: dto.skillId } });
    if (existing) {
      throw new ConflictException(`Worker already has skill '${skill.name}'`);
    }

    const workerSkill = this.workerSkillRepository.create({ workerId, skillId: dto.skillId });
    let saved: WorkerSkill;
    try {
      saved = await this.workerSkillRepository.save(workerSkill);
    } catch (error: any) {
      // The findOne check above is racy under concurrent requests (e.g. a double-click with no
      // in-flight guard) — fall back to the DB's own unique constraint as the source of truth.
      if (error.code === '23505') {
        throw new ConflictException(`Worker already has skill '${skill.name}'`);
      }
      throw error;
    }

    await this.auditLogService.log('WORKER_SKILL_ASSIGNED', 'WorkerSkill', saved.id, {
      workerId,
      skillId: dto.skillId,
      assignedBy: currentUser.id,
    });

    saved.skill = skill;
    return saved;
  }

  async remove(workerId: string, skillId: string, currentUser: AuthenticatedUser): Promise<void> {
    const workerSkill = await this.workerSkillRepository.findOne({ where: { workerId, skillId } });
    if (!workerSkill) {
      throw new NotFoundException(`Worker does not have this skill assigned`);
    }

    // repository.remove() clears the entity's id after deletion, so capture it first.
    const workerSkillId = workerSkill.id;
    await this.workerSkillRepository.remove(workerSkill);

    await this.auditLogService.log('WORKER_SKILL_REMOVED', 'WorkerSkill', workerSkillId, {
      workerId,
      skillId,
      removedBy: currentUser.id,
    });
  }
}
