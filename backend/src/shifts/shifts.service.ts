import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Shift, ShiftStatus } from '../entities/shift.entity';
import { ShiftRequirement } from '../entities/shift-requirement.entity';
import { ShiftAssignment, AssignmentStatus } from '../entities/shift-assignment.entity';
import { Participant } from '../entities/participant.entity';
import { Skill } from '../entities/skill.entity';
import { Worker } from '../entities/worker.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateShiftRequirementDto } from './dto/create-shift-requirement.dto';
import { UpdateShiftRequirementDto } from './dto/update-shift-requirement.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { RespondAssignmentDto } from './dto/respond-assignment.dto';
import { FilterShiftDto } from './dto/filter-shift.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { EligibilityService } from '../eligibility/eligibility.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(ShiftRequirement)
    private readonly requirementRepository: Repository<ShiftRequirement>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentRepository: Repository<ShiftAssignment>,
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    private readonly auditLogService: AuditLogService,
    private readonly eligibilityService: EligibilityService,
    private readonly dataSource: DataSource,
  ) {}

  private validateTimes(startTime: string, endTime: string): void {
    const start = this.timeToSeconds(startTime);
    const end = this.timeToSeconds(endTime);

    if (start >= end) {
      throw new BadRequestException(`startTime (${startTime}) must be strictly earlier than endTime (${endTime})`);
    }
  }

  private timeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    const seconds = parts[2] || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  async findAll(filter: FilterShiftDto, currentUser: AuthenticatedUser): Promise<Shift[]> {
    const query = this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.participant', 'participant')
      .leftJoinAndSelect('shift.requirements', 'requirements')
      .leftJoinAndSelect('requirements.skill', 'skill')
      .leftJoinAndSelect('shift.assignments', 'assignments')
      .leftJoinAndSelect('assignments.worker', 'worker')
      .leftJoinAndSelect('worker.user', 'user');

    if (currentUser.role === UserRole.WORKER) {
      if (!currentUser.workerId) {
        return [];
      }
      query.andWhere('assignments.workerId = :workerId', { workerId: currentUser.workerId });
    }

    if (filter.date) {
      query.andWhere('shift.date = :date', { date: filter.date });
    }
    if (filter.status) {
      query.andWhere('shift.status = :status', { status: filter.status });
    }
    if (filter.participantId) {
      query.andWhere('shift.participantId = :participantId', { participantId: filter.participantId });
    }

    return query.getMany();
  }

  async findOne(id: string, currentUser: AuthenticatedUser): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: [
        'participant',
        'requirements',
        'requirements.skill',
        'assignments',
        'assignments.worker',
        'assignments.worker.user',
      ],
    });

    if (!shift) {
      throw new NotFoundException(`Shift with ID '${id}' not found`);
    }

    if (currentUser.role === UserRole.WORKER) {
      const isAssigned = shift.assignments?.some((sa) => sa.workerId === currentUser.workerId);
      if (!isAssigned) {
        throw new ForbiddenException('Workers can only view shifts assigned to them');
      }
    }

    return shift;
  }

  async create(createShiftDto: CreateShiftDto, currentUser: AuthenticatedUser): Promise<Shift> {
    const participant = await this.participantRepository.findOne({ where: { id: createShiftDto.participantId } });
    if (!participant) {
      throw new NotFoundException(`Participant with ID '${createShiftDto.participantId}' not found`);
    }

    this.validateTimes(createShiftDto.startTime, createShiftDto.endTime);

    return this.dataSource.transaction(async (manager) => {
      const shift = manager.create(Shift, createShiftDto);
      const savedShift = await manager.save(shift);

      await this.auditLogService.log('SHIFT_CREATED', 'Shift', savedShift.id, { createdBy: currentUser.id }, manager);

      return savedShift;
    });
  }

  async update(id: string, updateShiftDto: UpdateShiftDto, currentUser: AuthenticatedUser): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({ where: { id } });
    if (!shift) {
      throw new NotFoundException(`Shift with ID '${id}' not found`);
    }

    if (updateShiftDto.participantId) {
      const participant = await this.participantRepository.findOne({ where: { id: updateShiftDto.participantId } });
      if (!participant) {
        throw new NotFoundException(`Participant with ID '${updateShiftDto.participantId}' not found`);
      }
    }

    const newStart = updateShiftDto.startTime ?? shift.startTime;
    const newEnd = updateShiftDto.endTime ?? shift.endTime;
    this.validateTimes(newStart, newEnd);

    return this.dataSource.transaction(async (manager) => {
      Object.assign(shift, updateShiftDto);
      const updatedShift = await manager.save(shift);

      await this.auditLogService.log('SHIFT_UPDATED', 'Shift', updatedShift.id, { updatedBy: currentUser.id }, manager);

      return updatedShift;
    });
  }

  // --- Requirements ---

  async addRequirement(shiftId: string, dto: CreateShiftRequirementDto): Promise<ShiftRequirement> {
    const shift = await this.shiftRepository.findOne({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift with ID '${shiftId}' not found`);

    const skill = await this.skillRepository.findOne({ where: { id: dto.skillId } });
    if (!skill) throw new NotFoundException(`Skill with ID '${dto.skillId}' not found`);

    const existing = await this.requirementRepository.findOne({ where: { shiftId, skillId: dto.skillId } });
    if (existing) {
      throw new ConflictException(`Skill requirement for '${skill.name}' already exists on this shift`);
    }

    const req = this.requirementRepository.create({
      shiftId,
      skillId: dto.skillId,
      requiredCount: dto.requiredCount,
    });

    let saved: ShiftRequirement;
    try {
      saved = await this.requirementRepository.save(req);
    } catch (error: any) {
      // The findOne check above is racy under concurrent requests (e.g. a double-click with no
      // in-flight guard) — fall back to the DB's own unique constraint as the source of truth.
      if (error.code === '23505') {
        throw new ConflictException(`Skill requirement for '${skill.name}' already exists on this shift`);
      }
      throw error;
    }

    // save() doesn't populate the skill relation — attach the one we already fetched above so
    // the frontend can render the name immediately instead of falling back to the raw skillId.
    saved.skill = skill;
    return saved;
  }

  async updateRequirement(shiftId: string, reqId: string, dto: UpdateShiftRequirementDto): Promise<ShiftRequirement> {
    const req = await this.requirementRepository.findOne({ where: { id: reqId, shiftId } });
    if (!req) {
      throw new NotFoundException(`Shift requirement '${reqId}' not found on shift '${shiftId}'`);
    }

    req.requiredCount = dto.requiredCount;
    return this.requirementRepository.save(req);
  }

  async removeRequirement(shiftId: string, reqId: string): Promise<void> {
    const req = await this.requirementRepository.findOne({ where: { id: reqId, shiftId } });
    if (!req) {
      throw new NotFoundException(`Shift requirement '${reqId}' not found on shift '${shiftId}'`);
    }
    await this.requirementRepository.remove(req);
  }

  // --- Assignments ---

  async findShiftAssignments(shiftId: string): Promise<ShiftAssignment[]> {
    const shift = await this.shiftRepository.findOne({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift with ID '${shiftId}' not found`);

    return this.assignmentRepository.find({
      where: { shiftId },
      relations: ['worker', 'worker.user'],
    });
  }

  async findMyAssignments(currentUser: AuthenticatedUser): Promise<ShiftAssignment[]> {
    if (!currentUser.workerId) {
      return [];
    }

    return this.assignmentRepository.find({
      where: { workerId: currentUser.workerId },
      relations: ['shift', 'shift.participant'],
    });
  }

  async createAssignment(shiftId: string, dto: CreateAssignmentDto, currentUser: AuthenticatedUser): Promise<ShiftAssignment> {
    const shift = await this.shiftRepository.findOne({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift with ID '${shiftId}' not found`);

    const worker = await this.workerRepository.findOne({ where: { id: dto.workerId } });
    if (!worker) throw new NotFoundException(`Worker with ID '${dto.workerId}' not found`);

    return this.dataSource.transaction(async (manager) => {
      // 1. Evaluate worker eligibility inside database transaction
      const eligibility = await this.eligibilityService.evaluateWorkerEligibility(shiftId, dto.workerId, manager);
      if (!eligibility.eligible) {
        throw new ConflictException({
          message: 'Worker is not eligible for this shift',
          reasons: eligibility.reasons,
          details: eligibility.details,
        });
      }

      // 2. Re-check duplicate assignment inside transaction
      const existing = await manager.findOne(ShiftAssignment, { where: { shiftId, workerId: dto.workerId } });
      if (existing) {
        throw new ConflictException(`Worker '${dto.workerId}' is already assigned to shift '${shiftId}'`);
      }

      const assignment = manager.create(ShiftAssignment, {
        shiftId,
        workerId: dto.workerId,
        status: AssignmentStatus.PENDING,
      });

      let savedAssignment: ShiftAssignment;
      try {
        savedAssignment = await manager.save(assignment);
      } catch (error: any) {
        // The findOne check above is racy under concurrent requests — fall back to the DB's own
        // unique constraint as the source of truth.
        if (error.code === '23505') {
          throw new ConflictException(`Worker '${dto.workerId}' is already assigned to shift '${shiftId}'`);
        }
        throw error;
      }
      await this.auditLogService.log(
        'ASSIGNMENT_CREATED',
        'ShiftAssignment',
        savedAssignment.id,
        { createdBy: currentUser.id, shiftId, workerId: dto.workerId },
        manager,
      );

      return savedAssignment;
    });
  }

  async respondAssignment(
    assignmentId: string,
    dto: RespondAssignmentDto,
    currentUser: AuthenticatedUser,
  ): Promise<ShiftAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['shift', 'worker'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID '${assignmentId}' not found`);
    }

    // Workers can only respond to their own assignment
    if (currentUser.role === UserRole.WORKER) {
      if (!currentUser.workerId || currentUser.workerId !== assignment.workerId) {
        throw new ForbiddenException('Workers can only respond to their own shift assignments');
      }
    }

    // State machine transition validation
    this.validateStatusTransition(assignment.status, dto.status);

    return this.dataSource.transaction(async (manager) => {
      assignment.status = dto.status;
      assignment.respondedAt = new Date();

      const updatedAssignment = await manager.save(assignment);

      let action = 'ASSIGNMENT_UPDATED';
      if (dto.status === AssignmentStatus.ACCEPTED) action = 'ASSIGNMENT_ACCEPTED';
      if (dto.status === AssignmentStatus.REJECTED) action = 'ASSIGNMENT_REJECTED';
      if (dto.status === AssignmentStatus.CANCELLED) action = 'ASSIGNMENT_CANCELLED';

      await this.auditLogService.log(
        action,
        'ShiftAssignment',
        updatedAssignment.id,
        { respondedBy: currentUser.id, status: dto.status },
        manager,
      );

      return updatedAssignment;
    });
  }

  private validateStatusTransition(current: AssignmentStatus, next: AssignmentStatus): void {
    const allowedTransitions: Record<AssignmentStatus, AssignmentStatus[]> = {
      [AssignmentStatus.PENDING]: [AssignmentStatus.ACCEPTED, AssignmentStatus.REJECTED, AssignmentStatus.CANCELLED],
      [AssignmentStatus.ACCEPTED]: [AssignmentStatus.CANCELLED],
      [AssignmentStatus.REJECTED]: [],
      [AssignmentStatus.CANCELLED]: [],
    };

    const allowed = allowedTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid assignment status transition from '${current}' to '${next}'. Allowed transitions: ${allowed.join(', ') || 'none'}`,
      );
    }
  }
}
