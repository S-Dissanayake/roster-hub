import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Injectable()
export class WorkerOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Admin & Coordinator have cross-worker access rights
    if (user.role === UserRole.ADMIN || user.role === UserRole.COORDINATOR) {
      return true;
    }

    // Worker role must be strictly scoped to their own resources
    if (user.role === UserRole.WORKER) {
      const params = request.params || {};
      const query = request.query || {};

      const targetWorkerId = params.workerId || query.workerId || params.id;
      const targetUserId = params.userId || query.userId;

      if (targetWorkerId && (!user.workerId || targetWorkerId !== user.workerId)) {
        throw new ForbiddenException('Workers are restricted to their own profile and roster data');
      }

      if (targetUserId && targetUserId !== user.id) {
        throw new ForbiddenException('Workers are restricted to their own profile and roster data');
      }

      return true;
    }

    return false;
  }
}
