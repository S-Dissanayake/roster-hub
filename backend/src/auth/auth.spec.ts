import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { WorkerOwnershipGuard } from './guards/worker-ownership.guard';
import { AuthController } from './auth.controller';
import { User, UserRole } from '../entities/user.entity';
import { KeycloakJwtPayload } from './interfaces/jwt-payload.interface';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn().mockReturnValue(() => 'test-secret'),
}));

describe('AuthModule (Authentication & RBAC)', () => {
  let jwtStrategy: JwtStrategy;
  let rolesGuard: RolesGuard;
  let workerOwnershipGuard: WorkerOwnershipGuard;
  let authController: AuthController;
  let reflector: Reflector;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'KEYCLOAK_URL') return 'http://localhost:8080';
      if (key === 'KEYCLOAK_REALM') return 'rosterflow';
      if (key === 'KEYCLOAK_CLIENT_ID') return 'rosterflow-backend';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        RolesGuard,
        WorkerOwnershipGuard,
        Reflector,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    workerOwnershipGuard = module.get<WorkerOwnershipGuard>(WorkerOwnershipGuard);
    authController = module.get<AuthController>(AuthController);
    reflector = module.get<Reflector>(Reflector);

    jest.clearAllMocks();
  });

  describe('JWT Strategy Role Extraction & Validation', () => {
    it('should extract role correctly from realm_access.roles', () => {
      const payload: KeycloakJwtPayload = {
        sub: 'kc-user-1',
        email: 'admin@rosterflow.com',
        realm_access: { roles: ['offline_access', 'admin'] },
      };

      const role = jwtStrategy.extractRole(payload, 'rosterflow-backend');
      expect(role).toBe(UserRole.ADMIN);
    });

    it('should extract role from resource_access[client].roles if realm roles do not specify', () => {
      const payload: KeycloakJwtPayload = {
        sub: 'kc-user-2',
        email: 'coord@rosterflow.com',
        realm_access: { roles: ['default-roles-rosterflow'] },
        resource_access: {
          'rosterflow-backend': { roles: ['coordinator'] },
        },
      };

      const role = jwtStrategy.extractRole(payload, 'rosterflow-backend');
      expect(role).toBe(UserRole.COORDINATOR);
    });

    it('should validate valid payload and attach DB user metadata', async () => {
      const payload: KeycloakJwtPayload = {
        sub: 'kc-user-3',
        email: 'worker@rosterflow.com',
        realm_access: { roles: ['worker'] },
      };

      mockUserRepository.findOne.mockResolvedValue({
        id: 'db-user-uuid-3',
        keycloakUserId: 'kc-user-3',
        email: 'worker@rosterflow.com',
        role: UserRole.WORKER,
        worker: { id: 'worker-uuid-3' },
      });

      const user = await jwtStrategy.validate(payload);
      expect(user.id).toBe('db-user-uuid-3');
      expect(user.email).toBe('worker@rosterflow.com');
      expect(user.role).toBe(UserRole.WORKER);
      expect(user.workerId).toBe('worker-uuid-3');
    });

    it('should throw UnauthorizedException when Keycloak sub is not found in database', async () => {
      const payload: KeycloakJwtPayload = {
        sub: 'unknown-kc-user',
        email: 'unknown@rosterflow.com',
        realm_access: { roles: ['worker'] },
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { keycloakUserId: 'unknown-kc-user' },
        relations: ['worker'],
      });
    });

    it('should throw UnauthorizedException on null or invalid payload sub', async () => {
      await expect(jwtStrategy.validate({ sub: '' } as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('RolesGuard (RBAC Authorization)', () => {
    function createMockContext(user: any): ExecutionContext {
      return {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as any;
    }

    it('should allow access when route has no required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext({ role: UserRole.WORKER });

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow access when user role matches required route role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext({ role: UserRole.ADMIN });

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when user role does not match required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
      const context = createMockContext({ role: UserRole.WORKER });

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user object is missing', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.WORKER]);
      const context = createMockContext(null);

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('WorkerOwnershipGuard (Resource Access Control)', () => {
    function createResourceContext(user: any, params: any = {}, query: any = {}): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user, params, query }),
        }),
      } as any;
    }

    it('should allow Admin to access any worker resource', () => {
      const context = createResourceContext({ role: UserRole.ADMIN, id: 'admin-id' }, { workerId: 'other-worker-id' });
      expect(workerOwnershipGuard.canActivate(context)).toBe(true);
    });

    it('should allow Coordinator to access any worker resource', () => {
      const context = createResourceContext({ role: UserRole.COORDINATOR, id: 'coord-id' }, { workerId: 'other-worker-id' });
      expect(workerOwnershipGuard.canActivate(context)).toBe(true);
    });

    it('should allow Worker to access their own workerId resource', () => {
      const context = createResourceContext(
        { role: UserRole.WORKER, id: 'user-1', workerId: 'w-1' },
        { workerId: 'w-1' },
      );
      expect(workerOwnershipGuard.canActivate(context)).toBe(true);
    });

    it('should block Worker from accessing another workerId resource', () => {
      const context = createResourceContext(
        { role: UserRole.WORKER, id: 'user-1', workerId: 'w-1' },
        { workerId: 'w-999' },
      );
      expect(() => workerOwnershipGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('AuthController Endpoint - GET /api/me', () => {
    it('should return normalized user object { id, email, role }', () => {
      const user = {
        id: 'user-uuid-123',
        keycloakUserId: 'kc-123',
        email: 'user@rosterflow.com',
        role: UserRole.WORKER,
      };

      const result = authController.getMe(user);
      expect(result).toEqual({
        id: 'user-uuid-123',
        email: 'user@rosterflow.com',
        role: UserRole.WORKER,
      });
    });
  });
});
