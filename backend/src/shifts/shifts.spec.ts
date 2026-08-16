import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ShiftsService } from './shifts.service';
import { WorkersService } from '../workers/workers.service';
import { ParticipantsService } from '../participants/participants.service';
import { Shift, ShiftStatus } from '../entities/shift.entity';
import { ShiftRequirement } from '../entities/shift-requirement.entity';
import { ShiftAssignment, AssignmentStatus } from '../entities/shift-assignment.entity';
import { Participant, ParticipantStatus } from '../entities/participant.entity';
import { Skill } from '../entities/skill.entity';
import { Worker, WorkerStatus } from '../entities/worker.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { EligibilityService } from '../eligibility/eligibility.service';

describe('Phase 4A & 4B Services & Authorization Specs', () => {
  let shiftsService: ShiftsService;
  let workersService: WorkersService;
  let participantsService: ParticipantsService;

  const mockShiftRepo = { findOne: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() };
  const mockRequirementRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn() };
  const mockAssignmentRepo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() };
  const mockParticipantRepo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() };
  const mockSkillRepo = { findOne: jest.fn(), find: jest.fn() };
  const mockWorkerRepo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() };
  const mockUserRepo = { findOne: jest.fn() };

  const mockAuditLogService = { log: jest.fn().mockResolvedValue(true) };
  const mockEligibilityService = {
    evaluateWorkerEligibility: jest.fn().mockResolvedValue({
      workerId: 'worker-1',
      eligible: true,
      reasons: [],
    }),
  };

  const mockDataSource = {
    // The transactional manager passed into service callbacks must proxy to the same repo mocks
    // the tests configure (e.g. mockAssignmentRepo.findOne) — production code (ShiftsService
    // .createAssignment) deliberately re-checks duplicates via `manager.findOne(ShiftAssignment, ...)`
    // instead of the injected repository, so a manager.findOne that ignores that mock can never see
    // a test-configured "existing assignment" and the duplicate-assignment path can never be exercised.
    transaction: jest.fn(async (cb) =>
      cb({
        save: jest.fn((entity) => Promise.resolve({ id: entity.id || 'generated-uuid', ...entity })),
        create: jest.fn((entityClass, dto) => dto),
        findOne: jest.fn((entityClass, options) => mockAssignmentRepo.findOne(options)),
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        WorkersService,
        ParticipantsService,
        { provide: getRepositoryToken(Shift), useValue: mockShiftRepo },
        { provide: getRepositoryToken(ShiftRequirement), useValue: mockRequirementRepo },
        { provide: getRepositoryToken(ShiftAssignment), useValue: mockAssignmentRepo },
        { provide: getRepositoryToken(Participant), useValue: mockParticipantRepo },
        { provide: getRepositoryToken(Skill), useValue: mockSkillRepo },
        { provide: getRepositoryToken(Worker), useValue: mockWorkerRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: EligibilityService, useValue: mockEligibilityService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    shiftsService = module.get<ShiftsService>(ShiftsService);
    workersService = module.get<WorkersService>(WorkersService);
    participantsService = module.get<ParticipantsService>(ParticipantsService);

    jest.clearAllMocks();
  });

  describe('WorkersService', () => {
    it('should create a worker successfully', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'user-uuid-1' });
      mockWorkerRepo.findOne.mockResolvedValue(null);

      const result = await workersService.create({ userId: 'user-uuid-1', phone: '0400111222' });
      expect(result).toBeDefined();
      expect(mockAuditLogService.log).toHaveBeenCalledWith('WORKER_CREATED', 'Worker', expect.any(String), expect.any(Object), expect.any(Object));
    });

    it('should retrieve a worker by ID', async () => {
      mockWorkerRepo.findOne.mockResolvedValue({ id: 'worker-1', status: WorkerStatus.ACTIVE });
      const worker = await workersService.findOne('worker-1');
      expect(worker.id).toBe('worker-1');
    });
  });

  describe('ParticipantsService', () => {
    it('should create a participant successfully', async () => {
      const dto = { firstName: 'John', lastName: 'Doe', phone: '0400000000', address: '123 Main St' };
      const currentUser = { id: 'admin-id', keycloakUserId: 'kc-1', email: 'admin@test.com', role: UserRole.ADMIN };

      const result = await participantsService.create(dto, currentUser);
      expect(result).toBeDefined();
      expect(mockAuditLogService.log).toHaveBeenCalledWith('PARTICIPANT_CREATED', 'Participant', expect.any(String), expect.any(Object), expect.any(Object));
    });
  });

  describe('ShiftsService - Shift Creation & Validation', () => {
    it('should create shift when participant exists and times are valid', async () => {
      mockParticipantRepo.findOne.mockResolvedValue({ id: 'part-1' });
      const currentUser = { id: 'admin-id', keycloakUserId: 'kc-1', email: 'admin@test.com', role: UserRole.ADMIN };

      const dto = {
        participantId: 'part-1',
        date: '2026-08-20',
        startTime: '09:00:00',
        endTime: '17:00:00',
      };

      const result = await shiftsService.create(dto, currentUser);
      expect(result).toBeDefined();
      expect(mockAuditLogService.log).toHaveBeenCalledWith('SHIFT_CREATED', 'Shift', expect.any(String), expect.any(Object), expect.any(Object));
    });

    it('should throw BadRequestException if startTime >= endTime', async () => {
      mockParticipantRepo.findOne.mockResolvedValue({ id: 'part-1' });
      const currentUser = { id: 'admin-id', keycloakUserId: 'kc-1', email: 'admin@test.com', role: UserRole.ADMIN };

      const dto = {
        participantId: 'part-1',
        date: '2026-08-20',
        startTime: '17:00:00',
        endTime: '09:00:00',
      };

      await expect(shiftsService.create(dto, currentUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('ShiftsService - Requirements & Assignments', () => {
    it('should add requirement to a shift', async () => {
      mockShiftRepo.findOne.mockResolvedValue({ id: 'shift-1' });
      mockSkillRepo.findOne.mockResolvedValue({ id: 'skill-1', name: 'Nursing' });
      mockRequirementRepo.findOne.mockResolvedValue(null);
      mockRequirementRepo.create.mockReturnValue({ shiftId: 'shift-1', skillId: 'skill-1', requiredCount: 2 });
      mockRequirementRepo.save.mockResolvedValue({ id: 'req-1', shiftId: 'shift-1', skillId: 'skill-1', requiredCount: 2 });

      const result = await shiftsService.addRequirement('shift-1', { skillId: 'skill-1', requiredCount: 2 });
      expect(result.requiredCount).toBe(2);
    });

    it('should create an assignment and throw ConflictException if duplicate', async () => {
      mockShiftRepo.findOne.mockResolvedValue({ id: 'shift-1' });
      mockWorkerRepo.findOne.mockResolvedValue({ id: 'worker-1' });
      mockAssignmentRepo.findOne.mockResolvedValue({ id: 'existing-assign' });

      const currentUser = { id: 'admin-id', keycloakUserId: 'kc-1', email: 'admin@test.com', role: UserRole.ADMIN };

      await expect(
        shiftsService.createAssignment('shift-1', { workerId: 'worker-1' }, currentUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow worker to accept their own assignment (pending -> accepted)', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'assign-1',
        workerId: 'worker-1',
        status: AssignmentStatus.PENDING,
      });

      const currentUser = {
        id: 'user-w1',
        keycloakUserId: 'kc-w1',
        email: 'w1@test.com',
        role: UserRole.WORKER,
        workerId: 'worker-1',
      };

      const result = await shiftsService.respondAssignment('assign-1', { status: AssignmentStatus.ACCEPTED }, currentUser);
      expect(result.status).toBe(AssignmentStatus.ACCEPTED);
    });

    it('should block worker from responding to another worker assignment', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'assign-2',
        workerId: 'other-worker',
        status: AssignmentStatus.PENDING,
      });

      const currentUser = {
        id: 'user-w1',
        keycloakUserId: 'kc-w1',
        email: 'w1@test.com',
        role: UserRole.WORKER,
        workerId: 'worker-1',
      };

      await expect(
        shiftsService.respondAssignment('assign-2', { status: AssignmentStatus.ACCEPTED }, currentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject invalid assignment state transitions (e.g. accepted -> pending)', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'assign-3',
        workerId: 'worker-1',
        status: AssignmentStatus.ACCEPTED,
      });

      const currentUser = {
        id: 'admin-id',
        keycloakUserId: 'kc-admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      };

      await expect(
        shiftsService.respondAssignment('assign-3', { status: AssignmentStatus.PENDING }, currentUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
