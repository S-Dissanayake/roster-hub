import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Participants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COORDINATOR)
@Controller('participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get()
  @ApiOperation({ summary: 'List all participants (Admin/Coordinator only)' })
  async findAll() {
    return this.participantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get participant details by ID (Admin/Coordinator only)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.participantsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create participant profile (Admin/Coordinator only)' })
  async create(@Body() createParticipantDto: CreateParticipantDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.participantsService.create(createParticipantDto, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update participant profile (Admin/Coordinator only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParticipantDto: UpdateParticipantDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.participantsService.update(id, updateParticipantDto, currentUser);
  }
}
