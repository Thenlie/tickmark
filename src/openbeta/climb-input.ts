import { fieldsFor } from '@/climb/fields';
import type { Climb, Discipline, GradeSystem, Pitch } from '@/climb/types';

/** OpenBeta's `SingleClimbChangeInput`, limited to what Tickmark sends. */
export type ClimbChangeInput = {
  id: string;
  name: string;
  disciplines: Record<Discipline, boolean>;
  grade: string;
  description?: string;
  location?: string;
  protection?: string;
  fa?: string;
  length?: number;
  boltsCount?: number;
  pitches?: PitchInput[];
};

type PitchInput = {
  id: string;
  parentId: string;
  pitchNumber: number;
  grades?: Partial<Record<GradeSystem, string>>;
  disciplines: Record<Discipline, boolean>;
};

const ALL_DISCIPLINES: readonly Discipline[] = [
  'trad',
  'sport',
  'tr',
  'aid',
  'alpine',
  'mixed',
  'ice',
  'snow',
  'bouldering',
  'deepwatersolo',
];

/** OpenBeta's `GradeTypeInput` has no WI field, so ice pitch grades can't be sent. */
const PITCH_GRADE_SYSTEMS: readonly GradeSystem[] = ['yds', 'french', 'uiaa', 'ewbank', 'vscale', 'font'];

function disciplineFlags(disciplines: readonly Discipline[]): Record<Discipline, boolean> {
  return Object.fromEntries(ALL_DISCIPLINES.map((d) => [d, disciplines.includes(d)])) as Record<Discipline, boolean>;
}

function text(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Builds the change OpenBeta stores for a climb. The local id doubles as the OpenBeta id,
 * so sending the same climb again updates it instead of adding a duplicate.
 * `newId` makes pitch ids; OpenBeta replaces the whole pitch list on every send.
 */
export function toClimbChange(climb: Climb, pitches: Pitch[], newId: () => string): ClimbChangeInput {
  const fields = fieldsFor(climb, pitches.length);
  const multiPitch = fields.pitches && pitches.length >= 2;
  const pitchGrades = PITCH_GRADE_SYSTEMS.includes(climb.gradeSystem);

  return {
    id: climb.id,
    name: climb.name.trim(),
    disciplines: disciplineFlags(climb.disciplines),
    grade: climb.grade ?? '',
    description: text(climb.description),
    location: text(climb.approach),
    protection: text(climb.protection),
    fa: text(climb.fa),
    length: climb.lengthM != null && climb.lengthM > 0 ? climb.lengthM : undefined,
    boltsCount: fields.bolts && climb.bolts != null ? climb.bolts : undefined,
    pitches: multiPitch
      ? pitches.map((p) => ({
          id: newId(),
          parentId: climb.id,
          pitchNumber: p.number,
          grades: pitchGrades && p.grade ? { [climb.gradeSystem]: p.grade } : undefined,
          disciplines: disciplineFlags(p.disciplines.length > 0 ? p.disciplines : climb.disciplines),
        }))
      : undefined,
  };
}

/** Fields Tickmark records that OpenBeta can't take yet. They stay on the phone. */
export function unsentFields(climb: Climb, pitches: Pitch[], photoCount: number): string[] {
  const fields = fieldsFor(climb, pitches.length);
  const out: string[] = [];
  if (fields.safety && climb.safety) out.push('safety');
  if (fields.aidGrade && climb.aidGrade) out.push('aid grade');
  if (fields.mixedGrade && climb.mixedGrade) out.push('mixed grade');
  if (fields.commitment && climb.commitment) out.push('commitment');
  if (climb.lat !== null) out.push('position');
  if (photoCount > 0) out.push('photos');
  if (pitches.length >= 2) {
    if (pitches.some((p) => p.lengthM !== null || p.description.trim() !== '' || p.bolts !== null)) {
      out.push('pitch lengths, bolts and descriptions');
    }
    if (!PITCH_GRADE_SYSTEMS.includes(climb.gradeSystem)) out.push('pitch grades');
  }
  return out;
}
