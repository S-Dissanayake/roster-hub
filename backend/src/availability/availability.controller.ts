import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WorkerOwnershipGuard } from '../auth/guards/worker-ownership.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('workers/:workerId/availability')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER)
  @UseGuards(WorkerOwnershipGuard)
  @ApiOperation({ summary: 'Get worker availability slots' })
  async findByWorker(@Param('workerId', ParseUUIDPipe) workerId: string) {
    return this.availabilityService.findByWorker(workerId);
  }

  @Post('workers/:workerId/availability')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER)
  @UseGuards(WorkerOwnershipGuard)
  @ApiOperation({ summary: 'Create availability slot for worker' })
  async create(
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @Body() createAvailabilityDto: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(workerId, createAvailabilityDto);
  }

  @Patch('availability/:id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER)
  @ApiOperation({ summary: 'Update availability slot' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.availabilityService.update(id, updateAvailabilityDto, currentUser);
  }

  @Delete('availability/:id')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER)
  @ApiOperation({ summary: 'Delete availability slot' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.availabilityService.remove(id, currentUser);
  }
}
