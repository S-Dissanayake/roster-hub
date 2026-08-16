import { writable } from 'svelte/store';
import type {
  Worker, CreateWorkerDto, UpdateWorkerDto,
  Participant, CreateParticipantDto, UpdateParticipantDto,
  Shift, CreateShiftDto, UpdateShiftDto, FilterShiftDto,
  CreateShiftRequirementDto, UpdateShiftRequirementDto,
  ShiftAssignment, CreateAssignmentDto,
  Skill,
  User, CreateUserDto,
} from '../../types/api';
import {
  getUsers, createUser,
  getWorkers, getWorker, createWorker, updateWorker,
  getParticipants, getParticipant, createParticipant, updateParticipant,
  getShifts, getShift, createShift, updateShift,
  addShiftRequirement, updateShiftRequirement, deleteShiftRequirement,
  getMyAssignments, getShiftAssignments, createAssignment, respondToAssignment,
  getSkills,
} from '../api/client';

interface DataState {
  users: User[];
  workers: Worker[];
  participants: Participant[];
  shifts: Shift[];
  skills: Skill[];
  // Derived from shifts[].assignments (there is no flat GET /assignments endpoint on the backend).
  assignments: ShiftAssignment[];
  myAssignments: ShiftAssignment[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DataState = {
  users: [],
  workers: [],
  participants: [],
  shifts: [],
  skills: [],
  assignments: [],
  myAssignments: [],
  isLoading: false,
  error: null,
};

function flattenAssignments(shifts: Shift[]): ShiftAssignment[] {
  return shifts.flatMap((shift) =>
    (shift.assignments || []).map((assignment) => ({ ...assignment, shift })),
  );
}

function createDataStore() {
  const { subscribe, set, update } = writable<DataState>(initialState);

  return {
    subscribe,

    // Users (admin-only — see UsersController RBAC)
    loadUsers: async () => {
      update(state => ({ ...state, isLoading: true, error: null }));
      try {
        const users = await getUsers();
        update(state => ({ ...state, users, isLoading: false }));
      } catch (err: any) {
        update(state => ({ ...state, isLoading: false, error: err.message }));
      }
    },

    addUser: async (data: CreateUserDto) => {
      try {
        const user = await createUser(data);
        update(state => ({ ...state, users: [...state.users, user] }));
        return user;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    // Workers
    loadWorkers: async () => {
      update(state => ({ ...state, isLoading: true, error: null }));
      try {
        const workers = await getWorkers();
        update(state => ({ ...state, workers, isLoading: false }));
      } catch (err: any) {
        update(state => ({ ...state, isLoading: false, error: err.message }));
      }
    },

    getWorker: async (id: string) => {
      try {
        return await getWorker(id);
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    addWorker: async (data: CreateWorkerDto) => {
      try {
        const worker = await createWorker(data);
        update(state => ({ ...state, workers: [...state.workers, worker] }));
        return worker;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    updateWorkerData: async (id: string, data: UpdateWorkerDto) => {
      try {
        const updated = await updateWorker(id, data);
        update(state => ({
          ...state,
          workers: state.workers.map(w => (w.id === id ? updated : w)),
        }));
        return updated;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    // Participants
    loadParticipants: async () => {
      update(state => ({ ...state, isLoading: true, error: null }));
      try {
        const participants = await getParticipants();
        update(state => ({ ...state, participants, isLoading: false }));
      } catch (err: any) {
        update(state => ({ ...state, isLoading: false, error: err.message }));
      }
    },

    getParticipant: async (id: string) => {
      try {
        return await getParticipant(id);
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    addParticipant: async (data: CreateParticipantDto) => {
      try {
        const participant = await createParticipant(data);
        update(state => ({ ...state, participants: [...state.participants, participant] }));
        return participant;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    updateParticipantData: async (id: string, data: UpdateParticipantDto) => {
      try {
        const updated = await updateParticipant(id, data);
        update(state => ({
          ...state,
          participants: state.participants.map(p => (p.id === id ? updated : p)),
        }));
        return updated;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    // Skills (read-only from the frontend — no worker-skill assignment endpoint exists)
    loadSkills: async () => {
      try {
        const skills = await getSkills();
        update(state => ({ ...state, skills }));
        return skills;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    // Shifts
    loadShifts: async (filters?: FilterShiftDto) => {
      update(state => ({ ...state, isLoading: true, error: null }));
      try {
        const shifts = await getShifts(filters);
        update(state => ({
          ...state,
          shifts,
          assignments: flattenAssignments(shifts),
          isLoading: false,
        }));
      } catch (err: any) {
        update(state => ({ ...state, isLoading: false, error: err.message }));
      }
    },

    getShift: async (id: string) => {
      try {
        return await getShift(id);
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    addShift: async (data: CreateShiftDto) => {
      try {
        const shift = await createShift(data);
        update(state => ({ ...state, shifts: [...state.shifts, shift] }));
        return shift;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    updateShiftData: async (id: string, data: UpdateShiftDto) => {
      try {
        const updated = await updateShift(id, data);
        update(state => ({
          ...state,
          shifts: state.shifts.map(s => (s.id === id ? updated : s)),
        }));
        return updated;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    // Shift requirements
    addShiftRequirement: async (shiftId: string, data: CreateShiftRequirementDto) => {
      return addShiftRequirement(shiftId, data);
    },

    updateShiftRequirement: async (shiftId: string, reqId: string, data: UpdateShiftRequirementDto) => {
      return updateShiftRequirement(shiftId, reqId, data);
    },

    removeShiftRequirement: async (shiftId: string, reqId: string) => {
      return deleteShiftRequirement(shiftId, reqId);
    },

    // Assignments — there is no flat GET /assignments endpoint on the backend; "all assignments"
    // is derived from shifts[].assignments, which GET /shifts already returns eagerly joined.
    loadAssignments: async () => {
      update(state => ({ ...state, isLoading: true, error: null }));
      try {
        const shifts = await getShifts();
        update(state => ({
          ...state,
          shifts,
          assignments: flattenAssignments(shifts),
          isLoading: false,
        }));
      } catch (err: any) {
        update(state => ({ ...state, isLoading: false, error: err.message }));
      }
    },

    loadMyAssignments: async () => {
      update(state => ({ ...state, isLoading: true, error: null }));
      try {
        const myAssignments = await getMyAssignments();
        update(state => ({ ...state, myAssignments, isLoading: false }));
      } catch (err: any) {
        update(state => ({ ...state, isLoading: false, error: err.message }));
      }
    },

    getShiftAssignments: async (shiftId: string) => {
      try {
        return await getShiftAssignments(shiftId);
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },

    // Throws ApiConflictError (with .reasons/.details) on eligibility/duplicate conflicts —
    // left uncaught so callers can render the specific reason.
    addAssignment: async (shiftId: string, data: CreateAssignmentDto) => {
      const assignment = await createAssignment(shiftId, data);
      update(state => ({
        ...state,
        shifts: state.shifts.map(s =>
          s.id === shiftId ? { ...s, assignments: [...(s.assignments || []), assignment] } : s,
        ),
        assignments: [...state.assignments, assignment],
      }));
      return assignment;
    },

    respondToAssignment: async (assignmentId: string, status: 'accepted' | 'rejected' | 'cancelled') => {
      try {
        const updated = await respondToAssignment(assignmentId, status);
        update(state => ({
          ...state,
          myAssignments: state.myAssignments.map(a => (a.id === assignmentId ? updated : a)),
          assignments: state.assignments.map(a => (a.id === assignmentId ? updated : a)),
        }));
        return updated;
      } catch (err: any) {
        update(state => ({ ...state, error: err.message }));
        throw err;
      }
    },
  };
}

export const data = createDataStore();
