import { describe, expect, it } from '@jest/globals';


import { distanceM } from '../geo';
import { changeKind, defaultSystem, GRADE_SCALES, gradeRank, isValidGrade } from '../grades';
import { hardestPitchGrade, totalPitchLength } from '../pitches';
import { toClimbChange } from '../../openbeta/climb-input';
import { computeStatus, displayStatus } from '../readiness';
import { findSimilarName, levenshtein, normalizeName } from '../similar-name';
import type { Area, Climb, Pitch } from '../types';

const baseClimb: Climb = {
  id: 'c1',
  createdAt: 0,
  updatedAt: 0,
  kind: 'rope',
  disciplines: ['sport'],
  areaId: 'a1',
  name: 'Chalk Dust Tango',
  gradeSystem: 'yds',
  grade: '5.10b',
  safety: null,
  aidGrade: null,
  mixedGrade: null,
  commitment: null,
  lengthM: null,
  bolts: null,
  fa: '',
  description: '',
  approach: '',
  protection: '',
  lat: null,
  lng: null,
  gpsAccuracyM: null,
  gpsAt: null,
  syncState: 'local',
  syncError: null,
  submittedVersion: null,
};

const leafArea: Area = {
  id: 'a1',
  name: 'Great Wall of Owens',
  parentId: 'p',
  ancestors: ['p'],
  pathTokens: ['USA', 'Great Wall of Owens'],
  gradeContext: 'US',
  isLeaf: true,
  isBoulder: false,
  lat: 37.4,
  lng: -118.5,
  fetchedAt: 0,
  childrenFetchedAt: null,
};

const pitch = (number: number, grade: string | null, lengthM: number | null = null): Pitch => ({
  climbId: 'c1',
  number,
  grade,
  lengthM,
  bolts: null,
  disciplines: ['trad'],
  description: '',
});

describe('grade scales', () => {
  it('lists YDS from 5.0 to 5.15d in order', () => {
    expect(GRADE_SCALES.yds[0]).toBe('5.0');
    expect(GRADE_SCALES.yds.at(-1)).toBe('5.15d');
    expect(gradeRank('yds', '5.10a')).toBeGreaterThan(gradeRank('yds', '5.9'));
  });

  it('picks the default system from gradeContext', () => {
    expect(defaultSystem('rope', 'US')).toBe('yds');
    expect(defaultSystem('rope', 'FR')).toBe('french');
    expect(defaultSystem('rope', 'AU')).toBe('ewbank');
    expect(defaultSystem('boulder', 'FR')).toBe('font');
    expect(defaultSystem('boulder', null)).toBe('vscale');
    expect(defaultSystem('ice', 'FR')).toBe('wi');
  });
});

describe('changeKind', () => {
  it('clears a grade that is not valid for the new kind and explains why', () => {
    const { patch, notice } = changeKind(baseClimb, 'boulder', 'US');
    expect(patch).toMatchObject({ kind: 'boulder', gradeSystem: 'vscale', grade: null, disciplines: ['bouldering'] });
    expect(notice).toContain('5.10b');
  });

  it('keeps disciplines that still apply', () => {
    const climb = { ...baseClimb, disciplines: ['trad', 'mixed', 'alpine'] as Climb['disciplines'] };
    expect(changeKind(climb, 'ice', 'US').patch.disciplines).toEqual(['mixed', 'alpine']);
  });

  it('does nothing when the kind is unchanged', () => {
    expect(changeKind(baseClimb, 'rope', 'US')).toEqual({ patch: {}, notice: null });
  });
});

describe('computeStatus', () => {
  it('is ready with the required fields and warns about missing GPS', () => {
    const s = computeStatus(baseClimb, [], leafArea);
    expect(s.status).toBe('ready');
    expect(s.warnings).toEqual(['no-position']);
  });

  it('lists what is missing', () => {
    const s = computeStatus({ ...baseClimb, name: ' ', grade: null, areaId: null }, [], null);
    expect(s.status).toBe('draft');
    expect(s.missing).toEqual(['area', 'name', 'grade']);
  });

  it('requires a grade on every pitch of a multi-pitch climb', () => {
    const s = computeStatus(baseClimb, [pitch(1, '5.8'), pitch(2, null)], leafArea);
    expect(s.missing).toEqual(['pitch grades']);
  });

  it('rejects a non-leaf area', () => {
    expect(computeStatus(baseClimb, [], { ...leafArea, isLeaf: false }).missing).toEqual(['area']);
  });

  it('does not warn when a position is logged', () => {
    expect(computeStatus({ ...baseClimb, lat: 1, lng: 2 }, [], leafArea).warnings).toEqual([]);
  });
});

describe('pitch rollups', () => {
  it('finds the hardest pitch and sums lengths', () => {
    const pitches = [pitch(1, '5.8', 30), pitch(2, '5.10c', 35), pitch(3, '5.9', null)];
    expect(hardestPitchGrade('yds', pitches)).toBe('5.10c');
    expect(totalPitchLength(pitches)).toBe(65);
    expect(totalPitchLength([pitch(1, null)])).toBeNull();
  });
});

describe('similar names', () => {
  it('normalizes case, punctuation and OpenBeta "Name, The" ordering', () => {
    expect(normalizeName('The Loaf')).toBe('loaf');
    expect(normalizeName('Loaf, The')).toBe('loaf');
    expect(normalizeName('Café  Crème!')).toBe('cafe creme');
  });

  it('matches near-identical names only', () => {
    const existing = [{ name: 'Chalk Dust Tangle' }, { name: 'Sunset Arete' }];
    expect(findSimilarName('Chalk Dust Tango', existing)?.name).toBe('Chalk Dust Tangle');
    expect(findSimilarName('Moonrise Crack', existing)).toBeNull();
    expect(findSimilarName('ab', existing)).toBeNull();
  });

  it('computes edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('isValidGrade', () => {
  it('only accepts grades from the chosen system', () => {
    expect(isValidGrade('vscale', 'V5')).toBe(true);
    expect(isValidGrade('vscale', '5.10a')).toBe(false);
    expect(isValidGrade('uiaa', '7+')).toBe(true);
    expect(isValidGrade('yds', null)).toBe(false);
  });
});

describe('distanceM', () => {
  it('is about 111 km per degree of latitude', () => {
    expect(distanceM(0, 0, 1, 0)).toBeGreaterThan(110_000);
    expect(distanceM(0, 0, 1, 0)).toBeLessThan(112_000);
  });
});

describe('send readiness', () => {
  it('blocks a grade in a scale the crag does not use', () => {
    const s = computeStatus({ ...baseClimb, gradeSystem: 'french', grade: '6a' }, [], leafArea);
    expect(s.status).toBe('draft');
    expect(s.missing).toEqual(["grade in YDS (this area's scale)"]);
  });

  it('shows edits made after an accepted send', () => {
    const ready = computeStatus(baseClimb, [], leafArea);
    const sent = { ...baseClimb, syncState: 'submitted' as const, submittedVersion: 5, updatedAt: 5 };
    expect(displayStatus(sent, ready)).toBe('submitted');
    expect(displayStatus({ ...sent, updatedAt: 6 }, ready)).toBe('edited');
    expect(displayStatus({ ...baseClimb, syncState: 'pending' }, ready)).toBe('pending');
  });
});

describe('toClimbChange', () => {
  const ids = () => {
    let n = 0;
    return () => `p${++n}`;
  };

  it('reuses the local id and leaves out empty text', () => {
    const change = toClimbChange({ ...baseClimb, description: '  ', fa: ' Jo, 1999 ' }, [], ids());
    expect(change).toMatchObject({ id: 'c1', name: 'Chalk Dust Tango', grade: '5.10b', fa: 'Jo, 1999' });
    expect(change.description).toBeUndefined();
    expect(change.pitches).toBeUndefined();
    expect(change.disciplines).toMatchObject({ sport: true, trad: false, bouldering: false });
  });

  it('sends pitch grades in the climb scale', () => {
    const change = toClimbChange(baseClimb, [pitch(1, '5.8'), pitch(2, '5.10b')], ids());
    expect(change.pitches).toEqual([
      expect.objectContaining({ id: 'p1', parentId: 'c1', pitchNumber: 1, grades: { yds: '5.8' } }),
      expect.objectContaining({ id: 'p2', parentId: 'c1', pitchNumber: 2, grades: { yds: '5.10b' } }),
    ]);
  });

  it('only sends bolts for sport routes', () => {
    expect(toClimbChange({ ...baseClimb, bolts: 8 }, [], ids()).boltsCount).toBe(8);
    expect(toClimbChange({ ...baseClimb, disciplines: ['trad'], bolts: 8 }, [], ids()).boltsCount).toBeUndefined();
  });
});
