import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentStatus } from '../../entities/shift-assignment.entity';

export class RespondAssignmentDto {
  @ApiProperty({ enum: [AssignmentStatus.ACCEPTED, AssignmentStatus.REJECTED, AssignmentStatus.CANCELLED] })
  @IsEnum(AssignmentStatus)
  status: AssignmentStatus;
}
