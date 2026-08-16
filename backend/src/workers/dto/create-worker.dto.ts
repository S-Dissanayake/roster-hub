import { IsUUID, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkerStatus } from '../../entities/worker.entity';

export class CreateWorkerDto {
  @ApiProperty({ description: 'UUID of associated User entity' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: WorkerStatus, default: WorkerStatus.ACTIVE })
  @IsOptional()
  @IsEnum(WorkerStatus)
  status?: WorkerStatus;
}
