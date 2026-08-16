import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface KeycloakUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

/**
 * Talks to Keycloak's Admin REST API using the rosterflow-backend-admin service-account client
 * (client_credentials grant, scoped to the realm-management "manage-users" role only). This is
 * separate from the public rosterflow-backend client the SPA uses for login — that client has no
 * admin privileges by design.
 */
@Injectable()
export class KeycloakAdminService {
  constructor(private readonly configService: ConfigService) {}

  private keycloakUrl(): string {
    return this.configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080').replace(/\/$/, '');
  }

  private realm(): string {
    return this.configService.get<string>('KEYCLOAK_REALM', 'rosterflow');
  }

  private adminBaseUrl(): string {
    return `${this.keycloakUrl()}/admin/realms/${this.realm()}`;
  }

  private async getAdminToken(): Promise<string> {
    const clientId = this.configService.get<string>('KEYCLOAK_ADMIN_CLIENT_ID');
    const clientSecret = this.configService.get<string>('KEYCLOAK_ADMIN_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('Keycloak admin client is not configured');
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(`${this.keycloakUrl()}/realms/${this.realm()}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Failed to authenticate with Keycloak admin API');
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  /** Creates a Keycloak user with a permanent password. Returns the new user's Keycloak ID. */
  async createUser(input: KeycloakUserInput): Promise<string> {
    const token = await this.getAdminToken();

    const response = await fetch(`${this.adminBaseUrl()}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: input.email,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        enabled: true,
        emailVerified: true,
        credentials: [{ type: 'password', value: input.password, temporary: false }],
      }),
    });

    if (response.status === 409) {
      throw new ConflictException(`A Keycloak account with email '${input.email}' already exists`);
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new InternalServerErrorException(`Failed to create Keycloak user: ${text || response.statusText}`);
    }

    const location = response.headers.get('Location') || response.headers.get('location');
    const keycloakUserId = location?.split('/').pop();
    if (!keycloakUserId) {
      throw new InternalServerErrorException('Keycloak did not return a user ID for the created account');
    }
    return keycloakUserId;
  }

  /** Assigns a realm role (must already exist in the realm — admin/coordinator/worker) to a user. */
  async assignRealmRole(keycloakUserId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();

    const roleResponse = await fetch(`${this.adminBaseUrl()}/roles/${roleName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!roleResponse.ok) {
      throw new InternalServerErrorException(`Realm role '${roleName}' not found in Keycloak`);
    }
    const role = await roleResponse.json();

    const assignResponse = await fetch(`${this.adminBaseUrl()}/users/${keycloakUserId}/role-mappings/realm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([role]),
    });
    if (!assignResponse.ok) {
      throw new InternalServerErrorException('Failed to assign realm role in Keycloak');
    }
  }

  /**
   * Deletes a Keycloak user — used to roll back a partially-completed create when the local DB
   * write fails after the Keycloak account was already provisioned. Best-effort: if this also
   * fails, the original error is what surfaces to the caller, not this one.
   */
  async deleteUser(keycloakUserId: string): Promise<void> {
    try {
      const token = await this.getAdminToken();
      await fetch(`${this.adminBaseUrl()}/users/${keycloakUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Swallowed deliberately — see doc comment above.
    }
  }
}
