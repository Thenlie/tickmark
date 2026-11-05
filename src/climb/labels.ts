import type { Discipline, Kind, Safety } from './types';

export const KIND_LABELS: Record<Kind, string> = {
  boulder: 'Boulder',
  rope: 'Rope',
  ice: 'Ice',
};

export const KINDS: readonly Kind[] = ['boulder', 'rope', 'ice'];

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  sport: 'Sport',
  trad: 'Trad',
  tr: 'Top rope',
  aid: 'Aid',
  alpine: 'Alpine',
  mixed: 'Mixed',
  ice: 'Ice',
  snow: 'Snow',
  bouldering: 'Boulder',
  deepwatersolo: 'Deep water solo',
};

export const SAFETY_LABELS: Record<Safety, string> = {
  PG: 'PG',
  PG13: 'PG-13',
  runout: 'Runout',
  R: 'R',
  X: 'X',
};

export function disciplineSummary(disciplines: readonly Discipline[]): string {
  return disciplines.map((d) => DISCIPLINE_LABELS[d]).join(' · ');
}
