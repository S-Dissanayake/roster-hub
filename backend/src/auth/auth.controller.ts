import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { WorkerOwnershipGuard } from './guards/worker-ownership.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { UserRole } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      ...(user.workerId ? { workerId: user.workerId } : {}),
    };
  }

  @Get('admin-only')
  @Roles(UserRole.ADMIN)
  getAdminData() {
    return { message: 'Admin access granted' };
  }

  @Get('coordinator-only')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  getCoordinatorData() {
    return { message: 'Coordinator access granted' };
  }

  @Get('worker-only')
  @Roles(UserRole.WORKER)
  getWorkerData() {
    return { message: 'Worker access granted' };
  }

  @Get('workers/:workerId/roster')
  @UseGuards(WorkerOwnershipGuard)
  getWorkerRoster(@Param('workerId') workerId: string) {
    return { message: `Roster for worker ${workerId}` };
  }
}
