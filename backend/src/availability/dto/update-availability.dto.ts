import { IsInt, Min, Max, IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({ description: 'Day of week: 0 (Sunday) to 6 (Saturday)', minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Start time (HH:mm or HH:mm:ss)', example: '08:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be a valid time in HH:mm or HH:mm:ss format',
  })
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (HH:mm or HH:mm:ss)', example: '16:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'endTime must be a valid time in HH:mm or HH:mm:ss format',
  })
  endTime?: string;
}
