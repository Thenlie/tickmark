import { SYSTEM_LABELS, defaultSystem, isValidGrade } from './grades';
import type { Area, Climb, Pitch } from './types';

export type ClimbStatus = {
  status: 'draft' | 'ready';
  /** Human-readable names of required fields that are still missing. */
  missing: string[];
  warnings: 'no-position'[];
};

/** Computed on read, never stored, so it can't drift from the data. */
export function computeStatus(climb: Climb, pitches: Pitch[], area: Area | null): ClimbStatus {
  const missing: string[] = [];

  if (climb.disciplines.length === 0) missing.push('discipline');
  if (!climb.areaId || !area?.isLeaf) missing.push('area');
  if (climb.name.trim() === '') missing.push('name');
  if (!isValidGrade(climb.gradeSystem, climb.grade)) {
    missing.push('grade');
  } else if (area?.isLeaf) {
    // OpenBeta reads the grade in the crag's own scale and silently drops anything else.
    const expected = defaultSystem(climb.kind, area.gradeContext);
    if (expected !== climb.gradeSystem) missing.push(`grade in ${SYSTEM_LABELS[expected]} (this area's scale)`);
  }
  if (pitches.length >= 2 && pitches.some((p) => !isValidGrade(climb.gradeSystem, p.grade))) {
    missing.push('pitch grades');
  }

  const warnings: ClimbStatus['warnings'] = climb.lat === null ? ['no-position'] : [];
  return { status: missing.length === 0 ? 'ready' : 'draft', missing, warnings };
}

/** What the user sees: readiness for climbs not yet sent, sync state after that. */
export type DisplayStatus = 'draft' | 'ready' | 'pending' | 'submitted' | 'edited' | 'failed';

export function displayStatus(climb: Climb, status: ClimbStatus): DisplayStatus {
  switch (climb.syncState) {
    case 'pending':
      return 'pending';
    case 'failed':
      return 'failed';
    case 'submitted':
      // Changes made after the accepted send haven't reached OpenBeta.
      return climb.submittedVersion !== null && climb.updatedAt > climb.submittedVersion ? 'edited' : 'submitted';
    default:
      return status.status;
  }
}

export const DISPLAY_STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: 'Draft',
  ready: 'Ready to send',
  pending: 'Waiting to send',
  submitted: 'On OpenBeta',
  edited: 'Edited since sending',
  failed: 'Send failed',
};

/** "Draft, 2 missing", "Waiting to send" */
export function statusLabel(climb: Climb, status: ClimbStatus): string {
  const shown = displayStatus(climb, status);
  return shown === 'draft' ? `Draft, ${status.missing.length} missing` : DISPLAY_STATUS_LABELS[shown];
}
