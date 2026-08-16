import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'coordinator', 'worker')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."worker_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."participant_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_status_enum" AS ENUM('draft', 'published', 'cancelled', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assignment_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'cancelled')`,
    );

    // 2. Create Users Table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "keycloakUserId" character varying NOT NULL,
        "email" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "role" "public"."user_role_enum" NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_keycloakUserId" UNIQUE ("keycloakUserId"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // 3. Create Workers Table
    await queryRunner.query(`
      CREATE TABLE "workers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "phone" character varying,
        "status" "public"."worker_status_enum" NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_workers_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_workers_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workers_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 4. Create Skills Table
    await queryRunner.query(`
      CREATE TABLE "skills" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_skills_name" UNIQUE ("name"),
        CONSTRAINT "PK_skills_id" PRIMARY KEY ("id")
      )
    `);

    // 5. Create WorkerSkills Table
    await queryRunner.query(`
      CREATE TABLE "worker_skills" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workerId" uuid NOT NULL,
        "skillId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_worker_skills_workerId_skillId" UNIQUE ("workerId", "skillId"),
        CONSTRAINT "PK_worker_skills_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_worker_skills_workerId" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_worker_skills_skillId" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_worker_skills_workerId" ON "worker_skills" ("workerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_worker_skills_skillId" ON "worker_skills" ("skillId")`);

    // 6. Create Participants Table
    await queryRunner.query(`
      CREATE TABLE "participants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "address" character varying NOT NULL,
        "status" "public"."participant_status_enum" NOT NULL DEFAULT 'active',
        "notes" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_participants_id" PRIMARY KEY ("id")
      )
    `);

    // 7. Create ParticipantPreferences Table
    await queryRunner.query(`
      CREATE TABLE "participant_preferences" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "participantId" uuid NOT NULL,
        "preferredWorkerId" uuid,
        "preferredGender" character varying,
        "preferredLanguage" character varying,
        "notes" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_participant_preferences_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_participant_preferences_participantId" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_participant_preferences_preferredWorkerId" FOREIGN KEY ("preferredWorkerId") REFERENCES "workers"("id") ON DELETE SET NULL
      )
    `);

    // 8. Create WorkerAvailabilities Table
    await queryRunner.query(`
      CREATE TABLE "worker_availabilities" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workerId" uuid NOT NULL,
        "dayOfWeek" integer NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_worker_availabilities_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_worker_availabilities_workerId" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_worker_availabilities_workerId_dayOfWeek" ON "worker_availabilities" ("workerId", "dayOfWeek")`);

    // 9. Create Shifts Table
    await queryRunner.query(`
      CREATE TABLE "shifts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "participantId" uuid NOT NULL,
        "date" DATE NOT NULL,
        "startTime" TIME NOT NULL,
        "endTime" TIME NOT NULL,
        "status" "public"."shift_status_enum" NOT NULL DEFAULT 'draft',
        "notes" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shifts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shifts_participantId" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_shifts_date" ON "shifts" ("date")`);
    await queryRunner.query(`CREATE INDEX "IDX_shifts_date_status" ON "shifts" ("date", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_shifts_participantId" ON "shifts" ("participantId")`);

    // 10. Create ShiftRequirements Table
    await queryRunner.query(`
      CREATE TABLE "shift_requirements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "shiftId" uuid NOT NULL,
        "skillId" uuid NOT NULL,
        "requiredCount" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shift_requirements_shiftId_skillId" UNIQUE ("shiftId", "skillId"),
        CONSTRAINT "PK_shift_requirements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shift_requirements_shiftId" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shift_requirements_skillId" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE
      )
    `);

    // 11. Create ShiftAssignments Table
    await queryRunner.query(`
      CREATE TABLE "shift_assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "shiftId" uuid NOT NULL,
        "workerId" uuid NOT NULL,
        "status" "public"."assignment_status_enum" NOT NULL DEFAULT 'pending',
        "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "respondedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shift_assignments_shiftId_workerId" UNIQUE ("shiftId", "workerId"),
        CONSTRAINT "PK_shift_assignments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shift_assignments_shiftId" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_shift_assignments_workerId" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_shift_assignments_workerId_status" ON "shift_assignments" ("workerId", "status")`);

    // 12. Create AuditLogs Table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actorUserId" uuid,
        "action" character varying NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" character varying NOT NULL,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_actorUserId" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "shift_assignments"`);
    await queryRunner.query(`DROP TABLE "shift_requirements"`);
    await queryRunner.query(`DROP TABLE "shifts"`);
    await queryRunner.query(`DROP TABLE "worker_availabilities"`);
    await queryRunner.query(`DROP TABLE "participant_preferences"`);
    await queryRunner.query(`DROP TABLE "participants"`);
    await queryRunner.query(`DROP TABLE "worker_skills"`);
    await queryRunner.query(`DROP TABLE "skills"`);
    await queryRunner.query(`DROP TABLE "workers"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."assignment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shift_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."participant_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."worker_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}
