import {
  User,
  UserRole,
  Worker,
  WorkerStatus,
  Skill,
  WorkerSkill,
  Participant,
  ParticipantStatus,
  ParticipantPreference,
  WorkerAvailability,
  Shift,
  ShiftStatus,
  ShiftRequirement,
  ShiftAssignment,
  AssignmentStatus,
  AuditLog,
} from './index';

describe('Database Entities', () => {
  it('should instantiate User entity correctly', () => {
    const user = new User();
    user.id = '123e4567-e89b-12d3-a456-426614174000';
    user.keycloakUserId = 'kc-123';
    user.email = 'test@example.com';
    user.firstName = 'Test';
    user.lastName = 'User';
    user.role = UserRole.ADMIN;

    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('admin');
  });

  it('should instantiate Worker and Skill entities correctly', () => {
    const worker = new Worker();
    worker.phone = '0400000000';
    worker.status = WorkerStatus.ACTIVE;

    const skill = new Skill();
    skill.name = 'First Aid';

    const workerSkill = new WorkerSkill();
    workerSkill.worker = worker;
    workerSkill.skill = skill;

    expect(workerSkill.skill.name).toBe('First Aid');
    expect(workerSkill.worker.status).toBe('active');
  });

  it('should instantiate Shift and ShiftAssignment correctly', () => {
    const shift = new Shift();
    shift.date = '2026-08-17';
    shift.startTime = '09:00:00';
    shift.endTime = '17:00:00';
    shift.status = ShiftStatus.DRAFT;

    const assignment = new ShiftAssignment();
    assignment.shift = shift;
    assignment.status = AssignmentStatus.PENDING;

    expect(assignment.status).toBe('pending');
    expect(assignment.shift.status).toBe('draft');
  });

  it('should instantiate AuditLog correctly', () => {
    const log = new AuditLog();
    log.action = 'SHIFT_CREATED';
    log.entityType = 'Shift';
    log.entityId = 'shift-uuid-123';
    log.metadata = { createdBy: 'admin-uuid' };

    expect(log.action).toBe('SHIFT_CREATED');
    expect(log.metadata.createdBy).toBe('admin-uuid');
  });
});
