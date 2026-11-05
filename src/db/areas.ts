import type { SQLiteDatabase } from 'expo-sqlite';

import { distanceM } from '@/climb/geo';
import type { Area } from '@/climb/types';

type AreaRow = {
  id: string;
  name: string;
  parent_id: string | null;
  ancestors: string;
  path_tokens: string;
  grade_context: string | null;
  is_leaf: number;
  is_boulder: number;
  lat: number | null;
  lng: number | null;
  fetched_at: number;
  children_fetched_at: number | null;
};

export type AreaClimb = { areaId: string; climbId: string; name: string; grade: string | null };

function toArea(r: AreaRow): Area {
  return {
    id: r.id,
    name: r.name,
    parentId: r.parent_id,
    ancestors: JSON.parse(r.ancestors) as string[],
    pathTokens: JSON.parse(r.path_tokens) as string[],
    gradeContext: r.grade_context,
    isLeaf: r.is_leaf === 1,
    isBoulder: r.is_boulder === 1,
    lat: r.lat,
    lng: r.lng,
    fetchedAt: r.fetched_at,
    childrenFetchedAt: r.children_fetched_at,
  };
}

export type AreaInput = Omit<Area, 'fetchedAt' | 'childrenFetchedAt'>;

/** Inserts or refreshes areas. Keeps `children_fetched_at` unless `childrenOf` names the parent. */
export async function upsertAreas(
  db: SQLiteDatabase,
  areas: AreaInput[],
  options: { childrenOf?: string } = {},
): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const a of areas) {
      await db.runAsync(
        `INSERT INTO areas (id, name, parent_id, ancestors, path_tokens, grade_context, is_leaf, is_boulder, lat, lng, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           parent_id = COALESCE(excluded.parent_id, areas.parent_id),
           ancestors = excluded.ancestors,
           path_tokens = excluded.path_tokens,
           grade_context = COALESCE(excluded.grade_context, areas.grade_context),
           is_leaf = excluded.is_leaf,
           is_boulder = excluded.is_boulder,
           lat = COALESCE(excluded.lat, areas.lat),
           lng = COALESCE(excluded.lng, areas.lng),
           fetched_at = excluded.fetched_at`,
        a.id,
        a.name,
        a.parentId,
        JSON.stringify(a.ancestors),
        JSON.stringify(a.pathTokens),
        a.gradeContext,
        a.isLeaf ? 1 : 0,
        a.isBoulder ? 1 : 0,
        a.lat,
        a.lng,
        now,
      );
    }
    if (options.childrenOf) {
      await db.runAsync('UPDATE areas SET children_fetched_at = ? WHERE id = ?', now, options.childrenOf);
    }
  });
}

/** Replaces the cached climb names for one area. Used by the similar-name hint. */
export async function replaceAreaClimbs(db: SQLiteDatabase, areaId: string, climbs: AreaClimb[]) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM area_climbs WHERE area_id = ?', areaId);
    for (const c of climbs) {
      await db.runAsync(
        'INSERT OR REPLACE INTO area_climbs (area_id, climb_id, name, grade) VALUES (?, ?, ?, ?)',
        areaId,
        c.climbId,
        c.name,
        c.grade,
      );
    }
  });
}

export async function listAreaClimbs(db: SQLiteDatabase, areaId: string): Promise<AreaClimb[]> {
  const rows = await db.getAllAsync<{ area_id: string; climb_id: string; name: string; grade: string | null }>(
    'SELECT * FROM area_climbs WHERE area_id = ?',
    areaId,
  );
  return rows.map((r) => ({ areaId: r.area_id, climbId: r.climb_id, name: r.name, grade: r.grade }));
}

export async function getArea(db: SQLiteDatabase, id: string): Promise<Area | null> {
  const row = await db.getFirstAsync<AreaRow>('SELECT * FROM areas WHERE id = ?', id);
  return row ? toArea(row) : null;
}

export async function getAreas(db: SQLiteDatabase, ids: string[]): Promise<Area[]> {
  if (ids.length === 0) return [];
  const rows = await db.getAllAsync<AreaRow>(
    `SELECT * FROM areas WHERE id IN (${ids.map(() => '?').join(', ')})`,
    ...ids,
  );
  return rows.map(toArea);
}

export async function getChildren(db: SQLiteDatabase, parentId: string | null): Promise<Area[]> {
  const rows = parentId
    ? await db.getAllAsync<AreaRow>('SELECT * FROM areas WHERE parent_id = ? ORDER BY name', parentId)
    : await db.getAllAsync<AreaRow>(
        'SELECT * FROM areas WHERE json_array_length(path_tokens) = 1 ORDER BY name',
      );
  return rows.map(toArea);
}

export async function searchCached(db: SQLiteDatabase, query: string, limit = 30): Promise<Area[]> {
  const rows = await db.getAllAsync<AreaRow>(
    `SELECT * FROM areas WHERE name LIKE ? ESCAPE '\\' ORDER BY is_leaf DESC, name LIMIT ?`,
    `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
    limit,
  );
  return rows.map(toArea);
}

/** Cached leaf areas sorted by distance from a point. Distance is computed in JS. */
export async function nearbyCached(
  db: SQLiteDatabase,
  lat: number,
  lng: number,
  maxDistanceM = 20_000,
  limit = 15,
): Promise<{ area: Area; distanceM: number }[]> {
  // A rough lat/lng box first so SQLite skips most rows.
  const dLat = maxDistanceM / 111_000;
  const dLng = dLat / Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const rows = await db.getAllAsync<AreaRow>(
    `SELECT * FROM areas WHERE is_leaf = 1 AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`,
    lat - dLat,
    lat + dLat,
    lng - dLng,
    lng + dLng,
  );
  return rows
    .map(toArea)
    .map((area) => ({ area, distanceM: distanceM(lat, lng, area.lat!, area.lng!) }))
    .filter((r) => r.distanceM <= maxDistanceM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

/** Leaf areas the user has recently put climbs in. */
export async function recentAreas(db: SQLiteDatabase, limit = 5): Promise<Area[]> {
  const rows = await db.getAllAsync<AreaRow>(
    `SELECT a.* FROM areas a
     JOIN (SELECT area_id, MAX(updated_at) AS last FROM climbs WHERE area_id IS NOT NULL GROUP BY area_id) c
       ON c.area_id = a.id
     ORDER BY c.last DESC LIMIT ?`,
    limit,
  );
  return rows.map(toArea);
}
