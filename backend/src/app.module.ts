import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit/audit-log.module';
import { UsersModule } from './users/users.module';
import { WorkersModule } from './workers/workers.module';
import { WorkerSkillsModule } from './worker-skills/worker-skills.module';
import { SkillsModule } from './skills/skills.module';
import { ParticipantsModule } from './participants/participants.module';
import { AvailabilityModule } from './availability/availability.module';
import { ShiftsModule } from './shifts/shifts.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import {
  User,
  Worker,
  Skill,
  WorkerSkill,
  Participant,
  ParticipantPreference,
  WorkerAvailability,
  Shift,
  ShiftRequirement,
  ShiftAssignment,
  AuditLog,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres_password'),
        database: configService.get<string>('DB_NAME', 'rosterflow'),
        entities: [
          User,
          Worker,
          Skill,
          WorkerSkill,
          Participant,
          ParticipantPreference,
          WorkerAvailability,
          Shift,
          ShiftRequirement,
          ShiftAssignment,
          AuditLog,
        ],
        synchronize: false,
      }),
    }),
    AuthModule,
    AuditLogModule,
    UsersModule,
    WorkersModule,
    WorkerSkillsModule,
    SkillsModule,
    ParticipantsModule,
    AvailabilityModule,
    ShiftsModule,
    EligibilityModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
