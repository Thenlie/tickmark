import type { SQLiteDatabase } from 'expo-sqlite';

import { replaceAreaClimbs, upsertAreas, type AreaInput } from '@/db/areas';

import { gql } from './client';
import {
  AREA_QUERY,
  COUNTRIES_QUERY,
  CRAGS_NEAR_QUERY,
  SEARCH_AREAS_QUERY,
  type AreaQueryResult,
  type CountriesResult,
  type CragsNearResult,
  type RemoteArea,
  type RemoteGrades,
  type SearchAreasResult,
} from './queries';

/**
 * Fetches from OpenBeta and writes into the local cache. The UI reads only from the
 * cache, so these are fire-and-forget: callers catch and ignore errors when offline.
 */

function toAreaInput(a: RemoteArea): AreaInput {
  // `ancestors` runs root → self on OpenBeta; tolerate it without self too.
  const chain = (a.ancestors ?? []).filter((id) => id !== a.uuid);
  return {
    id: a.uuid,
    name: a.areaName,
    parentId: chain.length > 0 ? chain[chain.length - 1] : null,
    ancestors: chain,
    pathTokens: a.pathTokens ?? [a.areaName],
    gradeContext: a.gradeContext,
    isLeaf: a.metadata.leaf,
    isBoulder: a.metadata.isBoulder ?? false,
    lat: a.metadata.lat,
    lng: a.metadata.lng,
  };
}

function firstGrade(grades: RemoteGrades | null): string | null {
  if (!grades) return null;
  return Object.values(grades).find((g): g is string => typeof g === 'string' && g !== '') ?? null;
}

/** Refreshes one area, its direct children and (for leaf areas) its climb names. */
export async function refreshArea(db: SQLiteDatabase, id: string): Promise<void> {
  const { area } = await gql<AreaQueryResult>(AREA_QUERY, { uuid: id });
  if (!area) return;
  await upsertAreas(db, [toAreaInput(area)]);
  await upsertAreas(db, area.children.map(toAreaInput), { childrenOf: area.uuid });
  await replaceAreaClimbs(
    db,
    area.uuid,
    area.climbs.map((c) => ({ areaId: area.uuid, climbId: c.uuid, name: c.name, grade: firstGrade(c.grades) })),
  );
}

export async function refreshCountries(db: SQLiteDatabase): Promise<void> {
  const { countries } = await gql<CountriesResult>(COUNTRIES_QUERY);
  await upsertAreas(db, countries.map(toAreaInput));
}

export async function searchRemote(db: SQLiteDatabase, match: string): Promise<void> {
  const { areas } = await gql<SearchAreasResult>(SEARCH_AREAS_QUERY, { match, limit: 30 });
  await upsertAreas(db, areas.map(toAreaInput));
}

export async function nearbyRemote(db: SQLiteDatabase, lat: number, lng: number): Promise<void> {
  const { cragsNear } = await gql<CragsNearResult>(CRAGS_NEAR_QUERY, { lat, lng, maxDistance: 20_000 });
  const crags = cragsNear.flatMap((bucket) => bucket.crags ?? []);
  await upsertAreas(db, crags.map(toAreaInput));
}
