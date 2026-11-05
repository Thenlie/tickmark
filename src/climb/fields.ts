import type { Climb, Kind } from './types';

export type FieldConfig = {
  pitches: boolean;
  bolts: boolean;
  safety: boolean;
  aidGrade: boolean;
  mixedGrade: boolean;
  commitment: boolean;
  lengthLabel: string;
  protectionPlaceholder: string;
};

/** Which optional fields Screen B shows for a climb, based on its kind and disciplines. */
export function fieldsFor(climb: Pick<Climb, 'kind' | 'disciplines'>, pitchCount: number): FieldConfig {
  const has = (d: Climb['disciplines'][number]) => climb.disciplines.includes(d);
  const kind: Kind = climb.kind;

  if (kind === 'boulder') {
    return {
      pitches: false,
      bolts: false,
      safety: false,
      aidGrade: false,
      mixedGrade: false,
      commitment: false,
      lengthLabel: 'Height (m)',
      protectionPlaceholder: 'Landing, pads, spotting',
    };
  }

  return {
    pitches: true,
    bolts: kind === 'rope' && has('sport'),
    safety: true,
    aidGrade: kind === 'rope' && has('aid'),
    mixedGrade: has('mixed'),
    commitment: has('alpine') || pitchCount >= 2 || kind === 'ice',
    lengthLabel: 'Length (m)',
    protectionPlaceholder: kind === 'ice' ? 'Screws, V-threads, anchors' : 'Rack, anchors',
  };
}
