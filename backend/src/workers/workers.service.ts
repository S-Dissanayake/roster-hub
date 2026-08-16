import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Worker, WorkerStatus } from '../entities/worker.entity';
import { User, UserRole } from '../entities/user.entity';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Worker[]> {
    return this.workerRepository.find({
      relations: ['user', 'workerSkills', 'workerSkills.skill'],
    });
  }

  async findOne(id: string): Promise<Worker> {
    const worker = await this.workerRepository.findOne({
      where: { id },
      relations: ['user', 'workerSkills', 'workerSkills.skill', 'availabilities'],
    });

    if (!worker) {
      throw new NotFoundException(`Worker with ID '${id}' not found`);
    }

    return worker;
  }

  async create(createWorkerDto: CreateWorkerDto): Promise<Worker> {
    const user = await this.userRepository.findOne({ where: { id: createWorkerDto.userId } });
    if (!user) {
      throw new NotFoundException(`User with ID '${createWorkerDto.userId}' not found`);
    }

    const existingWorker = await this.workerRepository.findOne({ where: { userId: createWorkerDto.userId } });
    if (existingWorker) {
      throw new ConflictException(`Worker profile already exists for user '${createWorkerDto.userId}'`);
    }

    return this.dataSource.transaction(async (manager) => {
      const worker = manager.create(Worker, {
        userId: createWorkerDto.userId,
        phone: createWorkerDto.phone,
        status: createWorkerDto.status || WorkerStatus.ACTIVE,
      });

      let savedWorker: Worker;
      try {
        savedWorker = await manager.save(worker);
      } catch (error: any) {
        // The findOne check above is racy under concurrent requests (e.g. a double-click with no
        // in-flight guard) — fall back to the DB's own unique constraint as the source of truth.
        if (error.code === '23505') {
          throw new ConflictException(`Worker profile already exists for user '${createWorkerDto.userId}'`);
        }
        throw error;
      }
      await this.auditLogService.log('WORKER_CREATED', 'Worker', savedWorker.id, { createdBy: user.id }, manager);

      // manager.save() doesn't populate the user relation — attach the one already fetched above
      // so the frontend can render name/email immediately instead of showing blank cells.
      savedWorker.user = user;
      savedWorker.workerSkills = [];
      return savedWorker;
    });
  }

  async update(id: string, updateWorkerDto: UpdateWorkerDto, currentUser: AuthenticatedUser): Promise<Worker> {
    const worker = await this.findOne(id);

    // If current user is a worker, disallow status modifications
    if (currentUser.role === UserRole.WORKER) {
      if (updateWorkerDto.status && updateWorkerDto.status !== worker.status) {
        throw new ForbiddenException('Workers are not permitted to modify their own status or role');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      if (updateWorkerDto.phone !== undefined) worker.phone = updateWorkerDto.phone;
      if (updateWorkerDto.status !== undefined) worker.status = updateWorkerDto.status;

      const updatedWorker = await manager.save(worker);
      await this.auditLogService.log('WORKER_UPDATED', 'Worker', updatedWorker.id, { updatedBy: currentUser.id }, manager);

      return updatedWorker;
    });
  }
}
