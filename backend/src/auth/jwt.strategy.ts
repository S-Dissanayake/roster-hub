import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { KeycloakJwtPayload, AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const keycloakUrl = configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'rosterflow');
    const jwksUri = `${keycloakUrl.replace(/\/$/, '')}/realms/${realm}/protocol/openid-connect/certs`;
    const issuer = `${keycloakUrl.replace(/\/$/, '')}/realms/${realm}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
      issuer,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload: sub claim missing');
    }

    // Deterministic lookup: JWT sub claim -> User.keycloakUserId
    const user = await this.userRepository.findOne({
      where: { keycloakUserId: payload.sub },
      relations: ['worker'],
    });

    if (!user) {
      throw new UnauthorizedException(`User with Keycloak ID '${payload.sub}' is not registered in system`);
    }

    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'rosterflow-backend');
    const extractedRole = this.extractRole(payload, clientId);

    const role = user.role || extractedRole;

    return {
      id: user.id,
      keycloakUserId: user.keycloakUserId,
      email: user.email,
      role,
      workerId: user.worker?.id,
    };
  }

  public extractRole(payload: KeycloakJwtPayload, clientId: string): UserRole {
    const recognizedRoles = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.WORKER];

    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles = payload.resource_access?.[clientId]?.roles || [];

    // Combine roles prioritizing realm roles over client roles
    const allRoles = [...realmRoles, ...clientRoles];

    for (const r of allRoles) {
      const lower = r.toLowerCase();
      if (recognizedRoles.includes(lower as UserRole)) {
        return lower as UserRole;
      }
    }

    return UserRole.WORKER;
  }
}
