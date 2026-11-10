import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { computeStatus } from '@/climb/readiness';
import { getArea } from '@/db/areas';
import { flushAll } from '@/db/autosave';
import { getClimb, listPendingClimbIds, listPitches, markFailed, markSubmitted } from '@/db/climbs';

import { toClimbChange } from './climb-input';
import { gql, OpenBetaError } from './client';
import { UPDATE_CLIMBS_MUTATION, type UpdateClimbsResult } from './queries';

/**
 * Sends queued climbs to OpenBeta. Climbs stay `pending` through network and server
 * errors and are tried again on the next run; only a rejection of the climb itself
 * marks it `failed`. Sends are upserts keyed on the climb id, so a retry after a lost
 * response can't create a duplicate.
 */

let running: Promise<void> | null = null;
let rerun = false;

/** Sends everything pending. Safe to call any time; concurrent calls share one run. */
export function sendPendingClimbs(db: SQLiteDatabase): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerun = false;
        await flushAll();
        for (const id of await listPendingClimbIds(db)) {
          // Stop at the first transient error: the connection is probably gone.
          if (!(await sendOne(db, id))) return;
        }
      } while (rerun);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Returns false when the send should be retried later. */
async function sendOne(db: SQLiteDatabase, id: string): Promise<boolean> {
  const climb = await getClimb(db, id);
  if (!climb || climb.syncState !== 'pending') return true;
  const [pitches, area] = await Promise.all([
    listPitches(db, id),
    climb.areaId ? getArea(db, climb.areaId) : Promise.resolve(null),
  ]);

  // Edited after queueing so it's no longer complete.
  const status = computeStatus(climb, pitches, area);
  if (status.status !== 'ready' || !climb.areaId) {
    await markFailed(db, id, `Still needed: ${status.missing.join(', ')}.`);
    return true;
  }

  try {
    await gql<UpdateClimbsResult>(UPDATE_CLIMBS_MUTATION, {
      input: { parentId: climb.areaId, changes: [toClimbChange(climb, pitches, randomUUID)] },
    });
  } catch (e) {
    if (isRetryable(e)) return false;
    await markFailed(db, id, e instanceof Error ? e.message : 'OpenBeta rejected this climb.');
    return true;
  }

  // Edits made while the request was in flight leave updatedAt ahead, so they show as unsent.
  await markSubmitted(db, id, climb.updatedAt);
  return true;
}

function isRetryable(e: unknown): boolean {
  if (!(e instanceof OpenBetaError)) return true;
  if (e.kind === 'network') return true;
  // 4xx means the request itself is wrong; anything else may be the server having a bad moment.
  if (e.kind === 'http') return e.status === undefined || e.status >= 500 || e.status === 408 || e.status === 429;
  return false;
}
