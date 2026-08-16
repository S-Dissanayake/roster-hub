import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateShiftRequirementDto } from './dto/create-shift-requirement.dto';
import { UpdateShiftRequirementDto } from './dto/update-shift-requirement.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { RespondAssignmentDto } from './dto/respond-assignment.dto';
import { FilterShiftDto } from './dto/filter-shift.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('shifts')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER)
  @ApiOperation({ summary: 'List shifts with optional filtering (date, status, participantId)' })
  async findAll(@Query() filter: FilterShiftDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.shiftsService.findAll(filter, currentUser);
  }

  @Get('shifts/:id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER)
  @ApiOperation({ summary: 'Get shift details by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.shiftsService.findOne(id, currentUser);
  }

  @Post('shifts')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Create a new shift (Admin/Coordinator)' })
  async create(@Body() createShiftDto: CreateShiftDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.shiftsService.create(createShiftDto, currentUser);
  }

  @Patch('shifts/:id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Update a shift (Admin/Coordinator)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShiftDto: UpdateShiftDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.shiftsService.update(id, updateShiftDto, currentUser);
  }

  // --- Requirements ---

  @Post('shifts/:shiftId/requirements')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Add a required skill to a shift' })
  async addRequirement(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: CreateShiftRequirementDto,
  ) {
    return this.shiftsService.addRequirement(shiftId, dto);
  }

  @Patch('shifts/:shiftId/requirements/:reqId')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Update required skill count for a shift' })
  async updateRequirement(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Param('reqId', ParseUUIDPipe) reqId: string,
    @Body() dto: UpdateShiftRequirementDto,
  ) {
    return this.shiftsService.updateRequirement(shiftId, reqId, dto);
  }

  @Delete('shifts/:shiftId/requirements/:reqId')
  @HttpCode(204)
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Remove a required skill from a shift' })
  async removeRequirement(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Param('reqId', ParseUUIDPipe) reqId: string,
  ) {
    return this.shiftsService.removeRequirement(shiftId, reqId);
  }

  // --- Assignments ---

  @Get('shifts/:shiftId/assignments')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Get assignments for a shift (Admin/Coordinator)' })
  async findShiftAssignments(@Param('shiftId', ParseUUIDPipe) shiftId: string) {
    return this.shiftsService.findShiftAssignments(shiftId);
  }

  @Post('shifts/:shiftId/assignments')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Create assignment for a shift (Admin/Coordinator)' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  @ApiResponse({ status: 409, description: 'Worker is already assigned to this shift' })
  async createAssignment(
    @Param('shiftId', ParseUUIDPipe) shiftId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.shiftsService.createAssignment(shiftId, dto, currentUser);
  }

  @Get('workers/me/assignments')
  @Roles(UserRole.WORKER, UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Get current authenticated worker assigned shifts' })
  async findMyAssignments(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.shiftsService.findMyAssignments(currentUser);
  }

  @Patch('assignments/:id/respond')
  @Roles(UserRole.WORKER, UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Respond to a shift assignment (accepted / rejected / cancelled)' })
  @ApiResponse({ status: 200, description: 'Assignment response recorded' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Forbidden cross-worker assignment response' })
  async respondAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondAssignmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.shiftsService.respondAssignment(id, dto, currentUser);
  }
}
