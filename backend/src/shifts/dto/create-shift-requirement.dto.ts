import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShiftRequirementDto {
  @ApiProperty({ description: 'Skill UUID' })
  @IsUUID()
  skillId: string;
}
