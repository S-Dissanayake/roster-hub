import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkersService } from './workers.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WorkerOwnershipGuard } from '../auth/guards/worker-ownership.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Workers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'List all workers (Admin/Coordinator)' })
  @ApiResponse({ status: 200, description: 'List of workers retrieved' })
  async findAll() {
    return this.workersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER)
  @UseGuards(WorkerOwnershipGuard)
  @ApiOperation({ summary: 'Get worker by ID' })
  @ApiResponse({ status: 200, description: 'Worker retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden cross-worker access' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Create new worker profile' })
  @ApiResponse({ status: 201, description: 'Worker created' })
  @ApiResponse({ status: 409, description: 'Worker profile already exists' })
  async create(@Body() createWorkerDto: CreateWorkerDto) {
    return this.workersService.create(createWorkerDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER)
  @UseGuards(WorkerOwnershipGuard)
  @ApiOperation({ summary: 'Update worker profile' })
  @ApiResponse({ status: 200, description: 'Worker updated' })
  @ApiResponse({ status: 403, description: 'Forbidden property modification' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkerDto: UpdateWorkerDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.workersService.update(id, updateWorkerDto, currentUser);
  }
}
