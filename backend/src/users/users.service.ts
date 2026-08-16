import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { KeycloakAdminService } from './keycloak-admin.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(withoutWorkerProfile: boolean): Promise<User[]> {
    if (!withoutWorkerProfile) {
      return this.userRepository.find({ order: { createdAt: 'DESC' } });
    }

    // Users with no linked Worker row — feeds the "Add Worker" form's user picker.
    const users = await this.userRepository.find({
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });
    return users.filter((user) => !user.worker);
  }

  async create(createUserDto: CreateUserDto, currentUser: AuthenticatedUser): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existing) {
      throw new ConflictException(`A user with email '${createUserDto.email}' already exists`);
    }

    const keycloakUserId = await this.keycloakAdminService.createUser({
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      password: createUserDto.password,
    });

    try {
      await this.keycloakAdminService.assignRealmRole(keycloakUserId, createUserDto.role);

      const user = this.userRepository.create({
        keycloakUserId,
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
      });
      const savedUser = await this.userRepository.save(user);

      await this.auditLogService.log('USER_CREATED', 'User', savedUser.id, { createdBy: currentUser.id });

      return savedUser;
    } catch (error) {
      // Keycloak account was created but the local record failed — don't leave an orphan account.
      await this.keycloakAdminService.deleteUser(keycloakUserId);
      throw error;
    }
  }
}
