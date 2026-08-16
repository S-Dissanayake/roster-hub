import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateShiftRequirementDto {
  @ApiProperty({ description: 'Required worker count (minimum 1)', minimum: 1 })
  @IsInt()
  @Min(1)
  requiredCount: number;
}
