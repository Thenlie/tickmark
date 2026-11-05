import { gradeRank } from './grades';
import type { GradeSystem, Pitch } from './types';

/** Hardest pitch grade, used as the climb's default overall grade. */
export function hardestPitchGrade(system: GradeSystem, pitches: Pitch[]): string | null {
  let best: string | null = null;
  for (const p of pitches) {
    if (gradeRank(system, p.grade) > gradeRank(system, best)) best = p.grade;
  }
  return best;
}

/** Sum of pitch lengths, or null if no pitch has a length. */
export function totalPitchLength(pitches: Pitch[]): number | null {
  const lengths = pitches.map((p) => p.lengthM).filter((l): l is number => l !== null);
  return lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) : null;
}
