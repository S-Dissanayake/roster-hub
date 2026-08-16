import { EligibilityReason } from '../enums/eligibility-reason.enum';

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
  reasons: EligibilityReason[];
  details?: EligibilityDetails;
}

export interface ShiftEligibilityReport {
  shiftId: string;
  workers: EligibilityResult[];
}
