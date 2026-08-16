import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EligibilityService } from './eligibility.service';
import { EligibilityReason } from './enums/eligibility-reason.enum';
import { Worker, WorkerStatus } from '../entities/worker.entity';
import { Shift, ShiftStatus } from '../entities/shift.entity';
import { ShiftAssignment, AssignmentStatus } from '../entities/shift-assignment.entity';

describe('EligibilityService (Rostering Eligibility Engine & Conflict Detection)', () => {
  let service: EligibilityService;

  const mockWorkerRepo = { findOne: jest.fn(), find: jest.fn() };
  const mockShiftRepo = { findOne: jest.fn() };
  const mockQueryBuilder = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const mockAssignmentRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EligibilityService,
        { provide: getRepositoryToken(Worker), useValue: mockWorkerRepo },
        { provide: getRepositoryToken(Shift), useValue: mockShiftRepo },
        { provide: getRepositoryToken(ShiftAssignment), useValue: mockAssignmentRepo },
      ],
    }).compile();

    service = module.get<EligibilityService>(EligibilityService);
    jest.clearAllMocks();
  });

  describe('Overlap Detection Helper (Strict Intervals)', () => {
    it('should detect exact same shift overlap', () => {
      expect(service.isOverlapping('09:00:00', '17:00:00', '09:00:00', '17:00:00')).toBe(true);
    });

    it('should detect shift starting before and ending during requested shift', () => {
      expect(service.isOverlapping('08:00:00', '10:00:00', '09:00:00', '12:00:00')).toBe(true);
    });

    it('should detect shift starting during and ending after requested shift', () => {
      expect(service.isOverlapping('11:00:00', '14:00:00', '09:00:00', '12:00:00')).toBe(true);
    });

    it('should detect existing shift contained inside requested shift', () => {
      expect(service.isOverlapping('10:00:00', '11:00:00', '09:00:00', '12:00:00')).toBe(true);
    });

    it('should detect requested shift contained inside existing shift', () => {
      expect(service.isOverlapping('08:00:00', '17:00:00', '09:00:00', '12:00:00')).toBe(true);
    });

    it('should NOT treat adjacent touch-point shifts as overlapping (09:00-12:00 and 12:00-15:00)', () => {
      expect(service.isOverlapping('09:00:00', '12:00:00', '12:00:00', '15:00:00')).toBe(false);
      expect(service.isOverlapping('12:00:00', '15:00:00', '09:00:00', '12:00:00')).toBe(false);
    });
  });

  describe('Rule 1: Worker Status', () => {
    it('should pass for ACTIVE worker', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: '2026-08-20',
        startTime: '09:00:00',
        endTime: '12:00:00',
        requirements: [],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [],
        availabilities: [{ dayOfWeek: service.getDayOfWeek('2026-08-20'), startTime: '08:00:00', endTime: '17:00:00' }],
      });

      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('should return INACTIVE_WORKER for INACTIVE worker', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: '2026-08-20',
        startTime: '09:00:00',
        endTime: '12:00:00',
        requirements: [],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.INACTIVE,
        workerSkills: [],
        availabilities: [{ dayOfWeek: service.getDayOfWeek('2026-08-20'), startTime: '08:00:00', endTime: '17:00:00' }],
      });

      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.INACTIVE_WORKER);
    });
  });

  describe('Rule 2: Skill Matching', () => {
    it('should return MISSING_SKILL when worker lacks a single required skill', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: '2026-08-20',
        startTime: '09:00:00',
        endTime: '12:00:00',
        requirements: [{ skillId: 'skill-first-aid', skill: { name: 'First Aid' } }],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [{ skillId: 'skill-transport', skill: { name: 'Transport' } }],
        availabilities: [{ dayOfWeek: service.getDayOfWeek('2026-08-20'), startTime: '08:00:00', endTime: '17:00:00' }],
      });

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.MISSING_SKILL);
      expect(result.details?.missingSkillIds).toContain('skill-first-aid');
    });

    it('should return MISSING_SKILL for multiple missing skills', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: '2026-08-20',
        startTime: '09:00:00',
        endTime: '12:00:00',
        requirements: [
          { skillId: 'sk-1', skill: { name: 'Skill 1' } },
          { skillId: 'sk-2', skill: { name: 'Skill 2' } },
        ],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [],
        availabilities: [{ dayOfWeek: service.getDayOfWeek('2026-08-20'), startTime: '08:00:00', endTime: '17:00:00' }],
      });

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.MISSING_SKILL);
      expect(result.details?.missingSkillIds?.length).toBe(2);
    });
  });

  describe('Rule 3: Availability Matching', () => {
    const shiftDate = '2026-08-20'; // Thursday (day 4)

    it('should pass when worker availability exact matches shift', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: shiftDate,
        startTime: '09:00:00',
        endTime: '17:00:00',
        requirements: [],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [],
        availabilities: [{ dayOfWeek: service.getDayOfWeek(shiftDate), startTime: '09:00:00', endTime: '17:00:00' }],
      });

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(true);
    });

    it('should pass when availability surrounds shift', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: shiftDate,
        startTime: '10:00:00',
        endTime: '14:00:00',
        requirements: [],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [],
        availabilities: [{ dayOfWeek: service.getDayOfWeek(shiftDate), startTime: '08:00:00', endTime: '18:00:00' }],
      });

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(true);
    });

    it('should fail with NOT_AVAILABLE when availability starts late', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: shiftDate,
        startTime: '09:00:00',
        endTime: '17:00:00',
        requirements: [],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [],
        availabilities: [{ dayOfWeek: service.getDayOfWeek(shiftDate), startTime: '10:00:00', endTime: '17:00:00' }],
      });

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.NOT_AVAILABLE);
    });

    it('should fail with NOT_AVAILABLE when availability ends early', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: shiftDate,
        startTime: '09:00:00',
        endTime: '17:00:00',
        requirements: [],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [],
        availabilities: [{ dayOfWeek: service.getDayOfWeek(shiftDate), startTime: '09:00:00', endTime: '16:00:00' }],
      });

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.NOT_AVAILABLE);
    });

    it('should fail with NOT_AVAILABLE when worker has no availability for that day', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: shiftDate,
        startTime: '09:00:00',
        endTime: '17:00:00',
        requirements: [],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [],
        availabilities: [],
      });

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.NOT_AVAILABLE);
    });
  });

  describe('Rule 4: Overlap Detection', () => {
    it('should return SHIFT_OVERLAP for active overlapping PENDING or ACCEPTED assignments', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: '2026-08-20',
        startTime: '09:00:00',
        endTime: '12:00:00',
        requirements: [],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.ACTIVE,
        workerSkills: [],
        availabilities: [{ dayOfWeek: service.getDayOfWeek('2026-08-20'), startTime: '08:00:00', endTime: '18:00:00' }],
      });

      mockQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'existing-sa-1',
          status: AssignmentStatus.ACCEPTED,
          shift: { id: 'other-s', startTime: '10:00:00', endTime: '14:00:00' },
        },
      ]);

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.SHIFT_OVERLAP);
    });

    it('should combine multiple failure reasons when multiple rules are violated', async () => {
      mockShiftRepo.findOne.mockResolvedValue({
        id: 's1',
        date: '2026-08-20',
        startTime: '09:00:00',
        endTime: '12:00:00',
        requirements: [{ skillId: 'req-skill', skill: { name: 'Nursing' } }],
      });

      mockWorkerRepo.findOne.mockResolvedValue({
        id: 'w1',
        status: WorkerStatus.INACTIVE,
        workerSkills: [],
        availabilities: [],
      });

      const result = await service.evaluateWorkerEligibility('s1', 'w1');
      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain(EligibilityReason.INACTIVE_WORKER);
      expect(result.reasons).toContain(EligibilityReason.MISSING_SKILL);
      expect(result.reasons).toContain(EligibilityReason.NOT_AVAILABLE);
    });
  });
});
