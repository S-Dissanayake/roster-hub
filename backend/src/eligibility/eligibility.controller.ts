import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EligibilityService } from './eligibility.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Eligibility')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR)
@Controller('shifts')
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get(':shiftId/eligibility')
  @ApiOperation({ summary: 'Evaluate eligibility for all workers for a shift (Admin/Coordinator)' })
  @ApiResponse({ status: 200, description: 'Shift eligibility report for all active workers' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async evaluateAllWorkers(@Param('shiftId', ParseUUIDPipe) shiftId: string) {
    return this.eligibilityService.evaluateAllWorkersEligibility(shiftId);
  }

  @Get(':shiftId/eligibility/:workerId')
  @ApiOperation({ summary: 'Evaluate eligibility for a single worker for a shift (Admin/Coordinator)' })
  @ApiResponse({ status: 200, description: 'Single worker eligibility result' })
  @ApiResponse({ status: 404, description: 'Shift or Worker not found' })
  async evaluateSingleWorker(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Param('workerId', ParseUUIDPipe) workerId: string,
  ) {
    return this.eligibilityService.evaluateWorkerEligibility(shiftId, workerId);
  }
}
