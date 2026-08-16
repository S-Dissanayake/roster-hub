import { IsUUID, IsString, Matches, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftStatus } from '../../entities/shift.entity';

export class UpdateShiftDto {
  @ApiPropertyOptional({ description: 'Participant UUID' })
  @IsOptional()
  @IsUUID()
  participantId?: string;

  @ApiPropertyOptional({ description: 'Date of shift (YYYY-MM-DD)', example: '2026-08-20' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({ description: 'Start time (HH:mm or HH:mm:ss)', example: '09:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be in HH:mm or HH:mm:ss format',
  })
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (HH:mm or HH:mm:ss)', example: '17:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'endTime must be in HH:mm or HH:mm:ss format',
  })
  endTime?: string;

  @ApiPropertyOptional({ enum: ShiftStatus })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({ description: 'Additional shift notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
