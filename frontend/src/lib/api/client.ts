import type {
  Worker, CreateWorkerDto, UpdateWorkerDto,
  Participant, CreateParticipantDto, UpdateParticipantDto,
  Shift, CreateShiftDto, UpdateShiftDto, FilterShiftDto,
  ShiftRequirement, CreateShiftRequirementDto,
  ShiftAssignment, CreateAssignmentDto,
  ShiftEligibilityReport, EligibilityReason, EligibilityDetails,
  Skill,
  WorkerAvailability, CreateAvailabilityDto, UpdateAvailabilityDto,
  WorkerSkill,
  AuthenticatedUser,
  User, CreateUserDto,
} from '../../types/api';
import { refreshAccessToken } from '../auth/keycloak';

// Backend AuthController.getMe() returns exactly these 3 fields.
export type MeResponse = AuthenticatedUser;

const API_BASE = '/api'; // Uses Vite proxy to forward to backend; matches the intended single-/api contract

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken || localStorage.getItem('auth_token');
}

// The Keycloak-issued id_token, kept alongside the access token so RP-Initiated Logout
// (auth.logout()) can pass it as id_token_hint when ending the Keycloak SSO session.
let idToken: string | null = null;

export function setIdToken(token: string | null) {
  idToken = token;
  if (token) {
    localStorage.setItem('id_token', token);
  } else {
    localStorage.removeItem('id_token');
  }
}

export function getIdToken(): string | null {
  return idToken || localStorage.getItem('id_token');
}

let refreshToken: string | null = null;

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  if (token) {
    localStorage.setItem('refresh_token', token);
  } else {
    localStorage.removeItem('refresh_token');
  }
}

export function getRefreshToken(): string | null {
  return refreshToken || localStorage.getItem('refresh_token');
}

// Dedupes concurrent 401s during the same expiry into a single refresh call instead of a stampede.
let refreshInFlight: Promise<boolean> | null = null;

function tryRefreshToken(): Promise<boolean> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    return Promise.resolve(false);
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(currentRefreshToken)
      .then((tokens) => {
        setAuthToken(tokens.accessToken);
        // Keycloak doesn't reissue an id_token on refresh — keep the one from the original login.
        if (tokens.idToken) {
          setIdToken(tokens.idToken);
        }
        setRefreshToken(tokens.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Thrown for 409 responses so callers can render *why* (eligibility reasons/details) instead of
// just a generic message. Matches the body shape ShiftsService.createAssignment() throws.
export class ApiConflictError extends Error {
  reasons?: EligibilityReason[];
  details?: EligibilityDetails;

  constructor(message: string, reasons?: EligibilityReason[], details?: EligibilityDetails) {
    super(message);
    this.name = 'ApiConflictError';
    this.reasons = reasons;
    this.details = details;
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {},
  isRetry = false,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    // Access tokens are short-lived (5 min) — silently refresh and retry once before giving up.
    if (!isRetry && await tryRefreshToken()) {
      return fetchApi<T>(endpoint, options, true);
    }
    setAuthToken(null);
    setIdToken(null);
    setRefreshToken(null);
    window.location.href = '/';
    throw new Error('Unauthorized - please login');
  }

  if (response.status === 403) {
    throw new Error('Forbidden - you do not have permission to perform this action');
  }

  if (response.status === 409) {
    const errorData = await response.json().catch(() => ({})) as any;
    throw new ApiConflictError(
      errorData.message || 'Conflict - resource already exists',
      errorData.reasons,
      errorData.details,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as any;
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// AUTH
// ============================================================================

export async function getMe(): Promise<MeResponse> {
  return fetchApi<MeResponse>('/me');
}

// ============================================================================
// USERS
// ============================================================================
// Admin-only: creating a user provisions both a Keycloak account and the local User record.

export async function getUsers(filters?: { withoutWorkerProfile?: boolean }): Promise<User[]> {
  const qs = filters?.withoutWorkerProfile ? '?withoutWorkerProfile=true' : '';
  return fetchApi<User[]>(`/users${qs}`);
}

export async function createUser(data: CreateUserDto): Promise<User> {
  return fetchApi<User>('/users', {
    method: 'POST',
    body: data,
  });
}

// ============================================================================
// WORKERS
// ============================================================================
// Note: there is no DELETE /workers/:id on the backend (WorkersController has no @Delete) —
// no deleteWorker() here.

export async function getWorkers(): Promise<Worker[]> {
  return fetchApi<Worker[]>('/workers');
}

export async function getWorker(id: string): Promise<Worker> {
  return fetchApi<Worker>(`/workers/${id}`);
}

export async function createWorker(data: CreateWorkerDto): Promise<Worker> {
  return fetchApi<Worker>('/workers', {
    method: 'POST',
    body: data,
  });
}

export async function updateWorker(id: string, data: UpdateWorkerDto): Promise<Worker> {
  return fetchApi<Worker>(`/workers/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

// ============================================================================
// WORKER AVAILABILITY
// ============================================================================

export async function getWorkerAvailability(workerId: string): Promise<WorkerAvailability[]> {
  return fetchApi<WorkerAvailability[]>(`/workers/${workerId}/availability`);
}

export async function createWorkerAvailability(
  workerId: string,
  data: CreateAvailabilityDto,
): Promise<WorkerAvailability> {
  return fetchApi<WorkerAvailability>(`/workers/${workerId}/availability`, {
    method: 'POST',
    body: data,
  });
}

export async function updateAvailability(
  id: string,
  data: UpdateAvailabilityDto,
): Promise<WorkerAvailability> {
  return fetchApi<WorkerAvailability>(`/availability/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function deleteAvailability(id: string): Promise<void> {
  return fetchApi<void>(`/availability/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// WORKER SKILLS
// ============================================================================
// Admin/Coordinator only — see WorkerSkillsController RBAC.

export async function assignWorkerSkill(workerId: string, skillId: string): Promise<WorkerSkill> {
  return fetchApi<WorkerSkill>(`/workers/${workerId}/skills`, {
    method: 'POST',
    body: { skillId },
  });
}

export async function removeWorkerSkill(workerId: string, skillId: string): Promise<void> {
  return fetchApi<void>(`/workers/${workerId}/skills/${skillId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// PARTICIPANTS
// ============================================================================
// Note: there is no DELETE /participants/:id on the backend — no deleteParticipant() here.

export async function getParticipants(): Promise<Participant[]> {
  return fetchApi<Participant[]>('/participants');
}

export async function getParticipant(id: string): Promise<Participant> {
  return fetchApi<Participant>(`/participants/${id}`);
}

export async function createParticipant(data: CreateParticipantDto): Promise<Participant> {
  return fetchApi<Participant>('/participants', {
    method: 'POST',
    body: data,
  });
}

export async function updateParticipant(id: string, data: UpdateParticipantDto): Promise<Participant> {
  return fetchApi<Participant>(`/participants/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

// ============================================================================
// SHIFTS
// ============================================================================
// Note: there is no DELETE /shifts/:id on the backend — no deleteShift() here.

export async function getShifts(filters?: FilterShiftDto): Promise<Shift[]> {
  const query = new URLSearchParams();
  if (filters?.date) query.append('date', filters.date);
  if (filters?.status) query.append('status', filters.status);
  if (filters?.participantId) query.append('participantId', filters.participantId);
  const qs = query.toString();
  return fetchApi<Shift[]>(`/shifts${qs ? '?' + qs : ''}`);
}

export async function getShift(id: string): Promise<Shift> {
  return fetchApi<Shift>(`/shifts/${id}`);
}

export async function createShift(data: CreateShiftDto): Promise<Shift> {
  return fetchApi<Shift>('/shifts', {
    method: 'POST',
    body: data,
  });
}

export async function updateShift(id: string, data: UpdateShiftDto): Promise<Shift> {
  return fetchApi<Shift>(`/shifts/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function addShiftRequirement(
  shiftId: string,
  data: CreateShiftRequirementDto,
): Promise<ShiftRequirement> {
  return fetchApi<ShiftRequirement>(`/shifts/${shiftId}/requirements`, {
    method: 'POST',
    body: data,
  });
}

export async function deleteShiftRequirement(shiftId: string, reqId: string): Promise<void> {
  return fetchApi<void>(`/shifts/${shiftId}/requirements/${reqId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// ASSIGNMENTS
// ============================================================================

// Backend: GET /api/shifts/:shiftId/assignments - returns assignments for a specific shift
export async function getShiftAssignments(shiftId: string): Promise<ShiftAssignment[]> {
  return fetchApi<ShiftAssignment[]>(`/shifts/${shiftId}/assignments`);
}

// Backend: GET /api/workers/me/assignments
export async function getMyAssignments(): Promise<ShiftAssignment[]> {
  return fetchApi<ShiftAssignment[]>('/workers/me/assignments');
}

export async function createAssignment(shiftId: string, data: CreateAssignmentDto): Promise<ShiftAssignment> {
  return fetchApi<ShiftAssignment>(`/shifts/${shiftId}/assignments`, {
    method: 'POST',
    body: data,
  });
}

// Backend: PATCH /api/assignments/:id/respond
export async function respondToAssignment(
  assignmentId: string,
  status: 'accepted' | 'rejected' | 'cancelled',
): Promise<ShiftAssignment> {
  return fetchApi<ShiftAssignment>(`/assignments/${assignmentId}/respond`, {
    method: 'PATCH',
    body: { status },
  });
}

// ============================================================================
// ELIGIBILITY
// ============================================================================

export async function checkShiftEligibility(shiftId: string): Promise<ShiftEligibilityReport> {
  return fetchApi<ShiftEligibilityReport>(`/shifts/${shiftId}/eligibility`);
}

// ============================================================================
// SKILLS
// ============================================================================

export async function getSkills(): Promise<Skill[]> {
  return fetchApi<Skill[]>('/skills');
}
