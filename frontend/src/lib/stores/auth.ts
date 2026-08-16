import { writable, get } from 'svelte/store';
import type { UserRole } from '../../types/api';
import { getAuthToken, setAuthToken, getIdToken, setIdToken, setRefreshToken, getMe, type MeResponse } from '../api/client';
import { redirectToLogin, redirectToLogout, exchangeCodeForToken } from '../auth/keycloak';

interface AuthState {
  user: MeResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,

    initialize: async () => {
      update(state => ({ ...state, isLoading: true }));

      const token = getAuthToken();
      if (!token) {
        update(state => ({ ...state, isLoading: false }));
        return;
      }

      try {
        const user = await getMe();
        update(state => ({
          ...state,
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));
      } catch (err: any) {
        setAuthToken(null);
        update(state => ({
          ...state,
          isLoading: false,
          error: err.message,
        }));
      }
    },

    // Kicks off the Keycloak Authorization Code + PKCE redirect.
    login: async () => {
      await redirectToLogin();
    },

    // Called from the /auth/callback route with the ?code= query param.
    handleCallback: async (code: string) => {
      update(state => ({ ...state, isLoading: true, error: null }));
      try {
        const { accessToken, idToken, refreshToken } = await exchangeCodeForToken(code);
        setAuthToken(accessToken);
        setIdToken(idToken);
        setRefreshToken(refreshToken);
        const user = await getMe();
        update(state => ({
          ...state,
          user,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));
      } catch (err: any) {
        setAuthToken(null);
        setIdToken(null);
        setRefreshToken(null);
        update(state => ({
          ...state,
          isLoading: false,
          error: err.message,
        }));
        throw err;
      }
    },

    // Ends the Keycloak SSO session (not just this app's local session) so that logging back in
    // shows the credentials form again rather than silently re-authenticating the same user.
    logout: () => {
      const idToken = getIdToken();
      setAuthToken(null);
      setIdToken(null);
      setRefreshToken(null);
      set(initialState);
      redirectToLogout(idToken);
    },

    hasRole: (role: UserRole | UserRole[]) => {
      const state = get({ subscribe });
      if (!state.user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(state.user.role as UserRole);
    },
  };
}

export const auth = createAuthStore();
