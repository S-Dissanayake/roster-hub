import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'Worker UUID to assign' })
  @IsUUID()
  workerId: string;
}
