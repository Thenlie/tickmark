import { isValidGrade } from './grades';
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
  if (!isValidGrade(climb.gradeSystem, climb.grade)) missing.push('grade');
  if (pitches.length >= 2 && pitches.some((p) => !isValidGrade(climb.gradeSystem, p.grade))) {
    missing.push('pitch grades');
  }

  const warnings: ClimbStatus['warnings'] = climb.lat === null ? ['no-position'] : [];
  return { status: missing.length === 0 ? 'ready' : 'draft', missing, warnings };
}
