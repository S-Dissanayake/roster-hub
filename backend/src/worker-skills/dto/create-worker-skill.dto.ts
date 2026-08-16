import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkerSkillDto {
  @ApiProperty({ description: 'UUID of the Skill to assign to this worker' })
  @IsUUID()
  skillId: string;
}
