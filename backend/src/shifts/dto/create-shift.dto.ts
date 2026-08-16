import { IsUUID, IsString, IsNotEmpty, Matches, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftStatus } from '../../entities/shift.entity';

export class CreateShiftDto {
  @ApiProperty({ description: 'Participant UUID' })
  @IsUUID()
  participantId: string;

  @ApiProperty({ description: 'Date of shift (YYYY-MM-DD)', example: '2026-08-20' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({ description: 'Start time (HH:mm or HH:mm:ss)', example: '09:00:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be in HH:mm or HH:mm:ss format',
  })
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm or HH:mm:ss)', example: '17:00:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'endTime must be in HH:mm or HH:mm:ss format',
  })
  endTime: string;

  @ApiPropertyOptional({ enum: ShiftStatus, default: ShiftStatus.DRAFT })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({ description: 'Additional shift notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
