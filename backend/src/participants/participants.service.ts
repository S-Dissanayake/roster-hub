import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Participant } from '../entities/participant.entity';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Participant[]> {
    return this.participantRepository.find({
      relations: ['preferences'],
    });
  }

  async findOne(id: string): Promise<Participant> {
    const participant = await this.participantRepository.findOne({
      where: { id },
      relations: ['preferences'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with ID '${id}' not found`);
    }

    return participant;
  }

  async create(createParticipantDto: CreateParticipantDto, currentUser: AuthenticatedUser): Promise<Participant> {
    return this.dataSource.transaction(async (manager) => {
      const participant = manager.create(Participant, createParticipantDto);
      const savedParticipant = await manager.save(participant);

      await this.auditLogService.log(
        'PARTICIPANT_CREATED',
        'Participant',
        savedParticipant.id,
        { createdBy: currentUser.id },
        manager,
      );

      return savedParticipant;
    });
  }

  async update(
    id: string,
    updateParticipantDto: UpdateParticipantDto,
    currentUser: AuthenticatedUser,
  ): Promise<Participant> {
    const participant = await this.findOne(id);

    return this.dataSource.transaction(async (manager) => {
      Object.assign(participant, updateParticipantDto);
      const updatedParticipant = await manager.save(participant);

      await this.auditLogService.log(
        'PARTICIPANT_UPDATED',
        'Participant',
        updatedParticipant.id,
        { updatedBy: currentUser.id },
        manager,
      );

      return updatedParticipant;
    });
  }
}
