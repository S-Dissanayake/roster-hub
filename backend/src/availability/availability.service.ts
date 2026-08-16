import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerAvailability } from '../entities/worker-availability.entity';
import { Worker } from '../entities/worker.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(WorkerAvailability)
    private readonly availabilityRepository: Repository<WorkerAvailability>,
    @InjectRepository(Worker)
    private readonly workerRepository: Repository<Worker>,
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

  async findByWorker(workerId: string): Promise<WorkerAvailability[]> {
    const worker = await this.workerRepository.findOne({ where: { id: workerId } });
    if (!worker) {
      throw new NotFoundException(`Worker with ID '${workerId}' not found`);
    }

    return this.availabilityRepository.find({
      where: { workerId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async create(workerId: string, createAvailabilityDto: CreateAvailabilityDto): Promise<WorkerAvailability> {
    const worker = await this.workerRepository.findOne({ where: { id: workerId } });
    if (!worker) {
      throw new NotFoundException(`Worker with ID '${workerId}' not found`);
    }

    this.validateTimes(createAvailabilityDto.startTime, createAvailabilityDto.endTime);

    const availability = this.availabilityRepository.create({
      workerId,
      ...createAvailabilityDto,
    });

    return this.availabilityRepository.save(availability);
  }

  async update(
    id: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
    currentUser: AuthenticatedUser,
  ): Promise<WorkerAvailability> {
    const availability = await this.availabilityRepository.findOne({ where: { id } });
    if (!availability) {
      throw new NotFoundException(`Availability record with ID '${id}' not found`);
    }

    if (currentUser.role === UserRole.WORKER) {
      if (!currentUser.workerId || currentUser.workerId !== availability.workerId) {
        throw new ForbiddenException('Workers cannot modify another worker availability');
      }
    }

    const newStart = updateAvailabilityDto.startTime ?? availability.startTime;
    const newEnd = updateAvailabilityDto.endTime ?? availability.endTime;
    this.validateTimes(newStart, newEnd);

    Object.assign(availability, updateAvailabilityDto);
    return this.availabilityRepository.save(availability);
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const availability = await this.availabilityRepository.findOne({ where: { id } });
    if (!availability) {
      throw new NotFoundException(`Availability record with ID '${id}' not found`);
    }

    if (currentUser.role === UserRole.WORKER) {
      if (!currentUser.workerId || currentUser.workerId !== availability.workerId) {
        throw new ForbiddenException('Workers cannot delete another worker availability');
      }
    }

    await this.availabilityRepository.remove(availability);
  }
}
