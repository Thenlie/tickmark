import type { Climb, Discipline, GradeSystem, Kind, Safety } from './types';

function range(from: number, to: number, format: (n: number) => string): string[] {
  const out: string[] = [];
  for (let n = from; n <= to; n++) out.push(format(n));
  return out;
}

function withLetters(numbers: number[], letters: string[], format: (n: number, l: string) => string) {
  return numbers.flatMap((n) => letters.map((l) => format(n, l)));
}

/** Grade lists, easiest first. Index order is used to compare difficulty within a system. */
export const GRADE_SCALES: Record<GradeSystem, readonly string[]> = {
  yds: [
    ...range(0, 9, (n) => `5.${n}`),
    ...withLetters([10, 11, 12, 13, 14, 15], ['a', 'b', 'c', 'd'], (n, l) => `5.${n}${l}`),
  ],
  french: [
    '1', '2', '3', '4a', '4b', '4c', '5a', '5b', '5c',
    ...withLetters([6, 7, 8], ['a', 'a+', 'b', 'b+', 'c', 'c+'], (n, l) => `${n}${l}`),
    '9a', '9a+', '9b', '9b+', '9c',
  ],
  // OpenBeta only accepts Arabic numerals for UIAA ("7-", "7", "7+").
  uiaa: ['1', '2', '3-', '3', '3+', ...range(4, 11, String).flatMap((n) => [`${n}-`, n, `${n}+`]), '12-'],
  ewbank: range(1, 39, String),
  vscale: ['VB', ...range(0, 17, (n) => `V${n}`)],
  font: [
    '3', '4', '4+', '5', '5+',
    ...withLetters([6, 7, 8], ['A', 'A+', 'B', 'B+', 'C', 'C+'], (n, l) => `${n}${l}`),
    '9A',
  ],
  wi: range(1, 7, (n) => `WI${n}`),
};

export const SYSTEM_LABELS: Record<GradeSystem, string> = {
  yds: 'YDS',
  french: 'French',
  uiaa: 'UIAA',
  ewbank: 'Ewbank',
  vscale: 'V-scale',
  font: 'Font',
  wi: 'WI',
};

export const SAFETY_RATINGS: readonly Safety[] = ['PG', 'PG13', 'runout', 'R', 'X'];
export const AID_GRADES: readonly string[] = [...range(0, 5, (n) => `A${n}`), ...range(0, 5, (n) => `C${n}`)];
export const MIXED_GRADES: readonly string[] = range(1, 14, (n) => `M${n}`);
export const COMMITMENT_GRADES: readonly string[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const SYSTEMS_BY_KIND: Record<Kind, readonly GradeSystem[]> = {
  rope: ['yds', 'french', 'uiaa', 'ewbank'],
  boulder: ['vscale', 'font'],
  ice: ['wi'],
};

export function systemsFor(kind: Kind): readonly GradeSystem[] {
  return SYSTEMS_BY_KIND[kind];
}

/**
 * Default system for an OpenBeta `gradeContext`, following openbeta-graphql's
 * `gradeContextToGradeScales`. Contexts not listed there fall back to US for
 * Alaska and French/Font elsewhere. BRZ uses Brazilian Crux on OpenBeta, which
 * v1 doesn't list yet, so it falls back to French.
 */
export function defaultSystem(kind: Kind, gradeContext: string | null): GradeSystem {
  const ctx = gradeContext ?? 'US';
  if (kind === 'ice') return 'wi';
  if (kind === 'boulder') return ['US', 'AU', 'BRZ', 'ALSK'].includes(ctx) ? 'vscale' : 'font';
  switch (ctx) {
    case 'US':
    case 'ALSK':
      return 'yds';
    case 'AU':
      return 'ewbank';
    case 'UIAA':
      return 'uiaa';
    default:
      return 'french';
  }
}

export function isValidGrade(system: GradeSystem, grade: string | null): boolean {
  return grade !== null && GRADE_SCALES[system].includes(grade);
}

/** Higher is harder. -1 when the grade isn't in the system. */
export function gradeRank(system: GradeSystem, grade: string | null): number {
  return grade === null ? -1 : GRADE_SCALES[system].indexOf(grade);
}

const ROPE_DISCIPLINES: readonly Discipline[] = ['sport', 'trad', 'tr', 'aid', 'alpine', 'mixed', 'deepwatersolo'];
const ICE_DISCIPLINES: readonly Discipline[] = ['ice', 'mixed', 'alpine', 'snow'];
const BOULDER_DISCIPLINES: readonly Discipline[] = ['bouldering', 'deepwatersolo'];

export function disciplinesFor(kind: Kind): readonly Discipline[] {
  return kind === 'rope' ? ROPE_DISCIPLINES : kind === 'ice' ? ICE_DISCIPLINES : BOULDER_DISCIPLINES;
}

const DEFAULT_DISCIPLINES: Record<Kind, Discipline[]> = {
  rope: ['sport'],
  boulder: ['bouldering'],
  ice: ['ice'],
};

export type KindChange = {
  patch: Partial<Climb>;
  /** Set when the grade had to be cleared, so the UI can say why. */
  notice: string | null;
};

/** Works out what changes when the user switches kind. Keeps anything that is still valid. */
export function changeKind(climb: Climb, kind: Kind, gradeContext: string | null): KindChange {
  if (climb.kind === kind) return { patch: {}, notice: null };

  const allowed = disciplinesFor(kind);
  const kept = climb.disciplines.filter((d) => allowed.includes(d));
  const disciplines = kept.length > 0 ? kept : DEFAULT_DISCIPLINES[kind];

  const gradeSystem = systemsFor(kind).includes(climb.gradeSystem)
    ? climb.gradeSystem
    : defaultSystem(kind, gradeContext);
  const keepGrade = isValidGrade(gradeSystem, climb.grade);
  const notice =
    climb.grade && !keepGrade
      ? `Grade cleared: ${climb.grade} isn't a ${SYSTEM_LABELS[gradeSystem]} grade.`
      : null;

  return {
    patch: { kind, disciplines, gradeSystem, grade: keepGrade ? climb.grade : null },
    notice,
  };
}

/** Applies a gradeContext from a newly picked area, but only if the user hasn't chosen a grade yet. */
export function systemForArea(climb: Climb, gradeContext: string | null): GradeSystem {
  return climb.grade ? climb.gradeSystem : defaultSystem(climb.kind, gradeContext);
}
