/**
 * API Types
 * Request/Response types for all API endpoints
 */

// ============================================================================
// AUTH TYPES
// ============================================================================

export enum UserRole {
  ADMIN = 'admin',
  COORDINATOR = 'coordinator',
  WORKER = 'worker',
}

// Backend AuthController.getMe() returns id/email/role, plus workerId when the user has a linked
// Worker record (omitted otherwise — not null).
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  workerId?: string;
}

// ============================================================================
// WORKER TYPES
// ============================================================================

export enum WorkerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface Worker {
  id: string;
  userId: string;
  phone?: string;
  status: WorkerStatus;
  workerSkills: WorkerSkill[];
  // Only populated by GET /workers/:id (findOne); findAll() does not join availabilities.
  availabilities?: WorkerAvailability[];
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerSkill {
  id: string;
  skillId: string;
  skill: Skill;
  workerId: string;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerDto {
  userId: string;
  phone?: string;
  status?: WorkerStatus;
}

export interface UpdateWorkerDto {
  phone?: string;
  status?: WorkerStatus;
}

export interface WorkerAvailability {
  id: string;
  workerId: string;
  dayOfWeek: number; // 0 (Sunday) to 6 (Saturday) — matches JS Date#getUTCDay()
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  createdAt: string;
  updatedAt: string;
}

export interface CreateAvailabilityDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UpdateAvailabilityDto {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
}

// ============================================================================
// PARTICIPANT TYPES
// ============================================================================

export enum ParticipantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  status: ParticipantStatus;
  notes?: string;
  preferences?: ParticipantPreference[];
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantPreference {
  id: string;
  participantId: string;
  preferredWorkerId?: string;
  preferredWorker?: Worker;
  preferredGender?: string;
  preferredLanguage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParticipantDto {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  status?: ParticipantStatus;
  notes?: string;
}

export interface UpdateParticipantDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  status?: ParticipantStatus;
  notes?: string;
}

// ============================================================================
// SHIFT TYPES
// ============================================================================

export enum ShiftStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface Shift {
  id: string;
  participantId: string;
  participant?: Participant;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  status: ShiftStatus;
  notes?: string;
  // Only populated by findAll()/findOne(); create()/update() return the raw saved row with no relations.
  requirements?: ShiftRequirement[];
  assignments?: ShiftAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface ShiftRequirement {
  id: string;
  shiftId: string;
  skillId: string;
  skill?: Skill;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftDto {
  participantId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  status?: ShiftStatus;
  notes?: string;
}

export interface UpdateShiftDto {
  participantId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: ShiftStatus;
  notes?: string;
}

export interface CreateShiftRequirementDto {
  skillId: string;
}

export interface FilterShiftDto {
  date?: string; // YYYY-MM-DD
  status?: ShiftStatus;
  participantId?: string;
}

// ============================================================================
// SHIFT ASSIGNMENT TYPES
// ============================================================================

export enum AssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  shift?: Shift;
  workerId: string;
  worker?: Worker;
  status: AssignmentStatus;
  assignedAt: string; // CreateDateColumn
  respondedAt?: string; // Nullable when worker hasn't responded yet
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentDto {
  workerId: string;
}

export interface RespondAssignmentDto {
  status: AssignmentStatus.ACCEPTED | AssignmentStatus.REJECTED | AssignmentStatus.CANCELLED;
}

// ============================================================================
// ELIGIBILITY TYPES
// ============================================================================

export enum EligibilityReason {
  INACTIVE_WORKER = 'INACTIVE_WORKER',
  MISSING_SKILL = 'MISSING_SKILL',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  SHIFT_OVERLAP = 'SHIFT_OVERLAP',
}

export interface EligibilityDetails {
  missingSkillIds?: string[];
  missingSkillNames?: string[];
  overlappingAssignmentIds?: string[];
  [key: string]: any;
}

export interface EligibilityResult {
  workerId: string;
  workerName: string;
  workerEmail: string;
  eligible: boolean;
  reasons: EligibilityReason[]; // Array of failure reasons (empty if eligible)
  details?: EligibilityDetails;
}

export interface ShiftEligibilityReport {
  shiftId: string;
  workers: EligibilityResult[];
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface User {
  id: string;
  keycloakUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Provisions both a Keycloak account and the local User record — see UsersService.create().
export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
}

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================
// Note: AuditLog, PaginatedResponse, ApiRequestOptions and FilterParams were removed here —
// they were speculative and didn't correspond to any real backend endpoint or response shape.
// (AuditLog in particular: the entity's real shape is actorUserId/action(free-form string)/
// entityType/entityId/metadata/createdAt, and there is no controller exposing it at all.)

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Matches the ConflictException body thrown by ShiftsService.createAssignment() when a worker
// is ineligible: { message, reasons, details } where details is the same EligibilityDetails
// shape returned by the eligibility endpoints.
export interface ConflictErrorResponse extends ApiError {
  reasons?: EligibilityReason[];
  details?: EligibilityDetails;
}
