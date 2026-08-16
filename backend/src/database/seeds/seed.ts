import { AppDataSource } from '../../config/data-source';
import { User, UserRole } from '../../entities/user.entity';
import { Worker, WorkerStatus } from '../../entities/worker.entity';
import { Skill } from '../../entities/skill.entity';
import { WorkerSkill } from '../../entities/worker-skill.entity';
import { Participant, ParticipantStatus } from '../../entities/participant.entity';
import { ParticipantPreference } from '../../entities/participant-preference.entity';
import { WorkerAvailability } from '../../entities/worker-availability.entity';
import { Shift, ShiftStatus } from '../../entities/shift.entity';
import { ShiftRequirement } from '../../entities/shift-requirement.entity';
import { ShiftAssignment, AssignmentStatus } from '../../entities/shift-assignment.entity';
import { AuditLog } from '../../entities/audit-log.entity';

async function runSeed() {
  console.log('Initializing Data Source for seeding...');
  await AppDataSource.initialize();

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    console.log('Clearing existing data...');
    await queryRunner.query('TRUNCATE TABLE audit_logs, shift_assignments, shift_requirements, shifts, worker_availabilities, participant_preferences, participants, worker_skills, skills, workers, users CASCADE;');

    // 1. Create Users
    console.log('Seeding Users...');
    const userRepo = queryRunner.manager.getRepository(User);
    const adminUser = userRepo.create({
      keycloakUserId: 'kc-admin-001',
      email: 'admin@rosterflow.com',
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    });
    const coordUser = userRepo.create({
      keycloakUserId: 'kc-coord-001',
      email: 'coordinator@rosterflow.com',
      firstName: 'Sarah',
      lastName: 'Coordinator',
      role: UserRole.COORDINATOR,
    });
    const worker1User = userRepo.create({
      keycloakUserId: 'kc-worker-001',
      email: 'worker1@rosterflow.com',
      firstName: 'Alice',
      lastName: 'Smith',
      role: UserRole.WORKER,
    });
    const worker2User = userRepo.create({
      keycloakUserId: 'kc-worker-002',
      email: 'worker2@rosterflow.com',
      firstName: 'Bob',
      lastName: 'Jones',
      role: UserRole.WORKER,
    });
    const worker3User = userRepo.create({
      keycloakUserId: 'kc-worker-003',
      email: 'worker3@rosterflow.com',
      firstName: 'Charlie',
      lastName: 'Brown',
      role: UserRole.WORKER,
    });
    await userRepo.save([adminUser, coordUser, worker1User, worker2User, worker3User]);

    // 2. Create Workers
    console.log('Seeding Workers...');
    const workerRepo = queryRunner.manager.getRepository(Worker);
    const w1 = workerRepo.create({ userId: worker1User.id, phone: '0400111222', status: WorkerStatus.ACTIVE });
    const w2 = workerRepo.create({ userId: worker2User.id, phone: '0400333444', status: WorkerStatus.ACTIVE });
    const w3 = workerRepo.create({ userId: worker3User.id, phone: '0400555666', status: WorkerStatus.ACTIVE });
    await workerRepo.save([w1, w2, w3]);

    // 3. Create Skills
    console.log('Seeding Skills...');
    const skillRepo = queryRunner.manager.getRepository(Skill);
    const personalCare = skillRepo.create({ name: 'Personal Care', description: 'Assisting with bathing, dressing, and mobility' });
    const medication = skillRepo.create({ name: 'Medication', description: 'Administering prescribed medication safely' });
    const transport = skillRepo.create({ name: 'Transport', description: 'Driving participant to appointments' });
    const firstAid = skillRepo.create({ name: 'First Aid', description: 'Certified in CPR and basic first aid' });
    await skillRepo.save([personalCare, medication, transport, firstAid]);

    // 4. Assign Skills to Workers
    console.log('Seeding Worker Skills...');
    const wsRepo = queryRunner.manager.getRepository(WorkerSkill);
    await wsRepo.save([
      wsRepo.create({ workerId: w1.id, skillId: personalCare.id }),
      wsRepo.create({ workerId: w1.id, skillId: firstAid.id }),
      wsRepo.create({ workerId: w1.id, skillId: medication.id }),
      wsRepo.create({ workerId: w2.id, skillId: personalCare.id }),
      wsRepo.create({ workerId: w2.id, skillId: transport.id }),
      wsRepo.create({ workerId: w3.id, skillId: firstAid.id }),
      wsRepo.create({ workerId: w3.id, skillId: transport.id }),
    ]);

    // 5. Create Worker Availabilities (Mon-Fri = 1-5, Sat=6, Sun=0)
    console.log('Seeding Worker Availability...');
    const waRepo = queryRunner.manager.getRepository(WorkerAvailability);
    const availabilities: WorkerAvailability[] = [];
    // W1: Mon-Fri 08:00 - 16:00
    for (let day = 1; day <= 5; day++) {
      availabilities.push(waRepo.create({ workerId: w1.id, dayOfWeek: day, startTime: '08:00:00', endTime: '16:00:00' }));
    }
    // W2: Mon-Fri 09:00 - 17:00
    for (let day = 1; day <= 5; day++) {
      availabilities.push(waRepo.create({ workerId: w2.id, dayOfWeek: day, startTime: '09:00:00', endTime: '17:00:00' }));
    }
    // W3: Wed-Sun 10:00 - 18:00 (days 3, 4, 5, 6, 0)
    for (const day of [3, 4, 5, 6, 0]) {
      availabilities.push(waRepo.create({ workerId: w3.id, dayOfWeek: day, startTime: '10:00:00', endTime: '18:00:00' }));
    }
    await waRepo.save(availabilities);

    // 6. Create Participants & Preferences
    console.log('Seeding Participants...');
    const partRepo = queryRunner.manager.getRepository(Participant);
    const p1 = partRepo.create({ firstName: 'John', lastName: 'Doe', phone: '0298765432', address: '123 Main St, Sydney', status: ParticipantStatus.ACTIVE, notes: 'Requires high assistance with mobility' });
    const p2 = partRepo.create({ firstName: 'Jane', lastName: 'Smith', phone: '0298765433', address: '45 Park Ave, Sydney', status: ParticipantStatus.ACTIVE, notes: 'Prefers morning appointments' });
    const p3 = partRepo.create({ firstName: 'Robert', lastName: 'Brown', phone: '0298765434', address: '78 High St, Sydney', status: ParticipantStatus.ACTIVE });
    await partRepo.save([p1, p2, p3]);

    const prefRepo = queryRunner.manager.getRepository(ParticipantPreference);
    await prefRepo.save([
      prefRepo.create({ participantId: p1.id, preferredWorkerId: w1.id, notes: 'Prefers Alice' }),
      prefRepo.create({ participantId: p2.id, preferredGender: 'female' }),
    ]);

    // 7. Create Shifts & Requirements
    console.log('Seeding Shifts & Requirements...');
    const shiftRepo = queryRunner.manager.getRepository(Shift);
    const reqRepo = queryRunner.manager.getRepository(ShiftRequirement);

    // Shift 1: Mon 2026-08-17 (Day 1), 09:00-12:00 for P1
    const shift1 = shiftRepo.create({ participantId: p1.id, date: '2026-08-17', startTime: '09:00:00', endTime: '12:00:00', status: ShiftStatus.PUBLISHED, notes: 'Morning care' });
    // Shift 2: Mon 2026-08-17 (Day 1), 13:00-16:00 for P2
    const shift2 = shiftRepo.create({ participantId: p2.id, date: '2026-08-17', startTime: '13:00:00', endTime: '16:00:00', status: ShiftStatus.PUBLISHED, notes: 'Afternoon outing' });
    // Shift 3: Tue 2026-08-18 (Day 2), 10:00-14:00 for P3 (Unassigned)
    const shift3 = shiftRepo.create({ participantId: p3.id, date: '2026-08-18', startTime: '10:00:00', endTime: '14:00:00', status: ShiftStatus.PUBLISHED, notes: 'Community access' });
    // Shift 4: Wed 2026-08-19 (Day 3), 11:00-15:00 for P1 (Unassigned)
    const shift4 = shiftRepo.create({ participantId: p1.id, date: '2026-08-19', startTime: '11:00:00', endTime: '15:00:00', status: ShiftStatus.PUBLISHED, notes: 'Medication management' });
    await shiftRepo.save([shift1, shift2, shift3, shift4]);

    await reqRepo.save([
      reqRepo.create({ shiftId: shift1.id, skillId: personalCare.id }),
      reqRepo.create({ shiftId: shift1.id, skillId: firstAid.id }),
      reqRepo.create({ shiftId: shift2.id, skillId: personalCare.id }),
      reqRepo.create({ shiftId: shift2.id, skillId: transport.id }),
      reqRepo.create({ shiftId: shift3.id, skillId: firstAid.id }),
      reqRepo.create({ shiftId: shift4.id, skillId: medication.id }),
    ]);

    // 8. Create Shift Assignments
    console.log('Seeding Shift Assignments...');
    const assignRepo = queryRunner.manager.getRepository(ShiftAssignment);
    await assignRepo.save([
      assignRepo.create({ shiftId: shift1.id, workerId: w1.id, status: AssignmentStatus.ACCEPTED, respondedAt: new Date() }),
      assignRepo.create({ shiftId: shift2.id, workerId: w2.id, status: AssignmentStatus.PENDING }),
    ]);

    // 9. Create Sample Audit Log
    console.log('Seeding Audit Log...');
    const auditRepo = queryRunner.manager.getRepository(AuditLog);
    await auditRepo.save([
      auditRepo.create({ actorUserId: coordUser.id, action: 'SHIFT_CREATED', entityType: 'Shift', entityId: shift1.id, metadata: { participantId: p1.id, date: '2026-08-17' } }),
      auditRepo.create({ actorUserId: coordUser.id, action: 'WORKER_ASSIGNED', entityType: 'ShiftAssignment', entityId: shift1.id, metadata: { workerId: w1.id } }),
    ]);

    await queryRunner.commitTransaction();
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding error, rolling back:', error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

runSeed().catch((err) => {
  console.error('Seed execution failed:', err);
  process.exit(1);
});
