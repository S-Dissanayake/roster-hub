/**
 * Keycloak OAuth2 Authorization Code + PKCE flow, run entirely from the browser.
 *
 * The backend has no /auth/login or token-exchange endpoint — JwtStrategy only validates
 * already-issued Keycloak JWTs via JWKS. Per docs/keycloak.md the Keycloak client is a public
 * client with Standard Flow enabled and http://localhost:5173/* as a valid redirect URI, which
 * is exactly the setup for a SPA to talk to Keycloak directly with PKCE (no client secret,
 * no backend involvement).
 */

const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080').replace(/\/$/, '');
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'rosterflow';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'rosterflow-backend';

const CODE_VERIFIER_KEY = 'kc_pkce_code_verifier';

function realmUrl(): string {
  return `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
}

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

function postLogoutRedirectUri(): string {
  return `${window.location.origin}/`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/** Redirects the browser to Keycloak's login page. */
export async function redirectToLogin(): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${realmUrl()}/protocol/openid-connect/auth?${params.toString()}`;
}

interface TokenSet {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

/** Exchanges an authorization code (from the /auth/callback redirect) for an access/id/refresh token. */
export async function exchangeCodeForToken(code: string): Promise<TokenSet> {
  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
  if (!codeVerifier) {
    throw new Error('Missing PKCE code verifier — please try logging in again');
  }
  sessionStorage.removeItem(CODE_VERIFIER_KEY);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: KEYCLOAK_CLIENT_ID,
    code,
    redirect_uri: redirectUri(),
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${realmUrl()}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Keycloak token exchange failed (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json() as { access_token: string; id_token: string; refresh_token: string };
  return { accessToken: data.access_token, idToken: data.id_token, refreshToken: data.refresh_token };
}

/**
 * Exchanges a refresh_token for a new access/refresh token set. Keycloak's default access
 * token lifetime is short (5 min in this realm) — this lets the API client silently recover
 * from an expired access token instead of forcing a full Keycloak login redirect every time.
 *
 * Note: Keycloak does not reissue an id_token on refresh for this client (id_token reissuance
 * on refresh is optional per the OIDC spec) — callers should keep using the id_token from the
 * original login for anything that needs one (e.g. logout's id_token_hint).
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; idToken?: string; refreshToken: string }> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: KEYCLOAK_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${realmUrl()}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Keycloak token refresh failed (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json() as { access_token: string; id_token?: string; refresh_token: string };
  return { accessToken: data.access_token, idToken: data.id_token, refreshToken: data.refresh_token };
}

/**
 * Redirects the browser through Keycloak's RP-Initiated Logout endpoint, ending the Keycloak
 * SSO session (not just this app's local session) so the next login shows the credentials form
 * again instead of silently re-authenticating the same user. Passing id_token_hint lets Keycloak
 * skip its own confirmation interstitial and go straight to postLogoutRedirectUri.
 */
export function redirectToLogout(idToken: string | null): void {
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    post_logout_redirect_uri: postLogoutRedirectUri(),
  });
  if (idToken) {
    params.set('id_token_hint', idToken);
  }
  window.location.href = `${realmUrl()}/protocol/openid-connect/logout?${params.toString()}`;
}
