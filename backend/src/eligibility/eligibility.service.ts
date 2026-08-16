import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Worker, WorkerStatus } from '../entities/worker.entity';
import { Shift } from '../entities/shift.entity';
import { ShiftAssignment, AssignmentStatus } from '../entities/shift-assignment.entity';
import { EligibilityReason } from './enums/eligibility-reason.enum';
import { EligibilityResult, ShiftEligibilityReport } from './interfaces/eligibility-result.interface';

@Injectable()
export class EligibilityService {
  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentRepository: Repository<ShiftAssignment>,
  ) {}

  /**
   * Helper to evaluate strict interval overlap:
   * existing.start < requested.end AND existing.end > requested.start
   */
  public isOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
    const sA = this.timeToSeconds(startA);
    const eA = this.timeToSeconds(endA);
    const sB = this.timeToSeconds(startB);
    const eB = this.timeToSeconds(endB);

    return sA < eB && eA > sB;
  }

  public timeToSeconds(timeStr: string): number {
    const parts = (timeStr || '').split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  public getDayOfWeek(dateStr: string): number {
    // Parse UTC YYYY-MM-DD
    const date = new Date(`${dateStr}T00:00:00Z`);
    return date.getUTCDay(); // 0 = Sunday, 6 = Saturday
  }

  /**
   * Evaluate eligibility for a single worker against a shift.
   * Can accept a custom EntityManager for transactional locks.
   */
  async evaluateWorkerEligibility(
    shiftId: string,
    workerId: string,
    transactionManager?: EntityManager,
  ): Promise<EligibilityResult> {
    const shiftRepo = transactionManager ? transactionManager.getRepository(Shift) : this.shiftRepository;
    const workerRepo = transactionManager ? transactionManager.getRepository(Worker) : this.workerRepository;
    const assignRepo = transactionManager ? transactionManager.getRepository(ShiftAssignment) : this.assignmentRepository;

    const shift = await shiftRepo.findOne({
      where: { id: shiftId },
      relations: ['requirements', 'requirements.skill'],
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID '${shiftId}' not found`);
    }

    const worker = await workerRepo.findOne({
      where: { id: workerId },
      relations: ['workerSkills', 'workerSkills.skill', 'availabilities', 'user'],
    });

    if (!worker) {
      throw new NotFoundException(`Worker with ID '${workerId}' not found`);
    }

    // Fetch active assignments for worker on shift.date
    const activeAssignments = await assignRepo.createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.shift', 'shift')
      .where('assignment.workerId = :workerId', { workerId })
      .andWhere('shift.date = :date', { date: shift.date })
      .andWhere('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED],
      })
      .andWhere('assignment.shiftId != :shiftId', { shiftId: shift.id })
      .getMany();

    return this.calculateEligibility(shift, worker, activeAssignments);
  }

  /**
   * Evaluate eligibility for all active workers for a given shift using batch queries.
   */
  async evaluateAllWorkersEligibility(shiftId: string): Promise<ShiftEligibilityReport> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['requirements', 'requirements.skill'],
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID '${shiftId}' not found`);
    }

    // Fetch all active workers with skills and availabilities in one batch
    const workers = await this.workerRepository.find({
      relations: ['workerSkills', 'workerSkills.skill', 'availabilities', 'user'],
    });

    // Fetch all active assignments on this shift.date in one query
    const activeAssignments = await this.assignmentRepository.createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.shift', 'shift')
      .where('shift.date = :date', { date: shift.date })
      .andWhere('assignment.status IN (:...statuses)', {
        statuses: [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED],
      })
      .andWhere('assignment.shiftId != :shiftId', { shiftId: shift.id })
      .getMany();

    // Map active assignments by workerId
    const assignmentsByWorker = new Map<string, ShiftAssignment[]>();
    for (const sa of activeAssignments) {
      const list = assignmentsByWorker.get(sa.workerId) || [];
      list.push(sa);
      assignmentsByWorker.set(sa.workerId, list);
    }

    const workerResults: EligibilityResult[] = workers.map((worker) => {
      const workerAssignments = assignmentsByWorker.get(worker.id) || [];
      return this.calculateEligibility(shift, worker, workerAssignments);
    });

    return {
      shiftId: shift.id,
      workers: workerResults,
    };
  }

  private calculateEligibility(
    shift: Shift,
    worker: Worker,
    activeAssignmentsOnSameDate: ShiftAssignment[],
  ): EligibilityResult {
    const reasons: EligibilityReason[] = [];
    const missingSkillIds: string[] = [];
    const missingSkillNames: string[] = [];

    // Rule 1: Worker Status
    if (worker.status !== WorkerStatus.ACTIVE) {
      reasons.push(EligibilityReason.INACTIVE_WORKER);
    }

    // Rule 2: Skill Matching
    const workerSkillIds = new Set((worker.workerSkills || []).map((ws) => ws.skillId));
    const requiredSkills = shift.requirements || [];

    for (const req of requiredSkills) {
      if (!workerSkillIds.has(req.skillId)) {
        if (!missingSkillIds.includes(req.skillId)) {
          missingSkillIds.push(req.skillId);
          if (req.skill?.name) missingSkillNames.push(req.skill.name);
        }
      }
    }

    if (missingSkillIds.length > 0) {
      reasons.push(EligibilityReason.MISSING_SKILL);
    }

    // Rule 3: Availability Matching
    const shiftDayOfWeek = this.getDayOfWeek(shift.date);
    const workerAvailabilities = (worker.availabilities || []).filter((a) => a.dayOfWeek === shiftDayOfWeek);

    const shiftStartSec = this.timeToSeconds(shift.startTime);
    const shiftEndSec = this.timeToSeconds(shift.endTime);

    const coversShift = workerAvailabilities.some((avail) => {
      const availStartSec = this.timeToSeconds(avail.startTime);
      const availEndSec = this.timeToSeconds(avail.endTime);
      return availStartSec <= shiftStartSec && availEndSec >= shiftEndSec;
    });

    if (!coversShift) {
      reasons.push(EligibilityReason.NOT_AVAILABLE);
    }

    // Rule 4: Overlap Detection
    const overlappingAssignmentIds: string[] = [];
    for (const sa of activeAssignmentsOnSameDate) {
      if (sa.shift) {
        if (this.isOverlapping(sa.shift.startTime, sa.shift.endTime, shift.startTime, shift.endTime)) {
          overlappingAssignmentIds.push(sa.id);
        }
      }
    }

    if (overlappingAssignmentIds.length > 0) {
      reasons.push(EligibilityReason.SHIFT_OVERLAP);
    }

    const eligible = reasons.length === 0;

    const result: EligibilityResult = {
      workerId: worker.id,
      workerName: worker.user ? `${worker.user.firstName} ${worker.user.lastName}` : worker.id,
      workerEmail: worker.user?.email ?? '',
      eligible,
      reasons,
    };

    if (!eligible) {
      result.details = {};
      if (missingSkillIds.length > 0) {
        result.details.missingSkillIds = missingSkillIds;
        result.details.missingSkillNames = missingSkillNames;
      }
      if (overlappingAssignmentIds.length > 0) {
        result.details.overlappingAssignmentIds = overlappingAssignmentIds;
      }
    }

    return result;
  }
}
