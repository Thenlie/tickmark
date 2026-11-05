import { computeStatus, type ClimbStatus } from '@/climb/readiness';
import type { Area, Climb, Photo, Pitch } from '@/climb/types';
import { getArea, getAreas } from '@/db/areas';
import { getClimb, listAllPitches, listClimbs, listPitches } from '@/db/climbs';
import { listPhotos } from '@/db/photos';

import { useDbQuery } from './use-db-query';

export type ClimbBundle = {
  climb: Climb;
  pitches: Pitch[];
  photos: Photo[];
  area: Area | null;
  status: ClimbStatus;
};

/** One climb with everything Screen B needs. `undefined` while loading, `null` if it doesn't exist. */
export function useClimb(id: string) {
  return useDbQuery<ClimbBundle | null>(
    async (db) => {
      const climb = await getClimb(db, id);
      if (!climb) return null;
      const [pitches, photos, area] = await Promise.all([
        listPitches(db, id),
        listPhotos(db, id),
        climb.areaId ? getArea(db, climb.areaId) : Promise.resolve(null),
      ]);
      return { climb, pitches, photos, area, status: computeStatus(climb, pitches, area) };
    },
    ['climbs', 'pitches', 'photos', 'areas'],
    id,
  ).data;
}

export type ClimbListItem = { climb: Climb; area: Area | null; status: ClimbStatus };

export function useClimbs() {
  return useDbQuery<ClimbListItem[]>(
    async (db) => {
      const [climbs, pitches] = await Promise.all([listClimbs(db), listAllPitches(db)]);
      const areas = await getAreas(db, [...new Set(climbs.flatMap((c) => (c.areaId ? [c.areaId] : [])))]);
      const areaById = new Map(areas.map((a) => [a.id, a]));
      return climbs.map((climb) => {
        const area = climb.areaId ? (areaById.get(climb.areaId) ?? null) : null;
        const own = pitches.filter((p) => p.climbId === climb.id);
        return { climb, area, status: computeStatus(climb, own, area) };
      });
    },
    ['climbs', 'pitches', 'areas'],
    'all',
  ).data;
}
