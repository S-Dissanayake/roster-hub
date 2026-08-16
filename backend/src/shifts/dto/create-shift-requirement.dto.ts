import { IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShiftRequirementDto {
  @ApiProperty({ description: 'Skill UUID' })
  @IsUUID()
  skillId: string;

  @ApiProperty({ description: 'Required worker count (minimum 1)', minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  requiredCount: number;
}
