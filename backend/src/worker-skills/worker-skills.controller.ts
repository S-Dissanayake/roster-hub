import { Controller, Post, Delete, Body, Param, ParseUUIDPipe, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkerSkillsService } from './worker-skills.service';
import { CreateWorkerSkillDto } from './dto/create-worker-skill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

// Admin/Coordinator only, deliberately — skills feed EligibilityService's MISSING_SKILL check,
// so letting a worker self-declare skills would let them self-certify their own eligibility.
@ApiTags('Worker Skills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR)
@Controller('workers/:workerId/skills')
export class WorkerSkillsController {
  constructor(private readonly workerSkillsService: WorkerSkillsService) {}

  @Post()
  @ApiOperation({ summary: 'Assign a skill to a worker (Admin/Coordinator)' })
  @ApiResponse({ status: 201, description: 'Skill assigned' })
  @ApiResponse({ status: 404, description: 'Worker or Skill not found' })
  @ApiResponse({ status: 409, description: 'Worker already has this skill' })
  async assign(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Body() dto: CreateWorkerSkillDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.workerSkillsService.assign(workerId, dto, currentUser);
  }

  @Delete(':skillId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a skill from a worker (Admin/Coordinator)' })
  @ApiResponse({ status: 204, description: 'Skill removed' })
  @ApiResponse({ status: 404, description: 'Worker does not have this skill assigned' })
  async remove(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.workerSkillsService.remove(workerId, skillId, currentUser);
  }
}
