import { UserRole } from '../../entities/user.entity';

export interface KeycloakJwtPayload {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
}

export interface AuthenticatedUser {
  id: string; // Database User UUID or Keycloak Sub fallback
  keycloakUserId: string;
  email: string;
  role: UserRole;
  workerId?: string; // Optional associated worker entity ID
}
