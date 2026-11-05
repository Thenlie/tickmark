import type { SQLiteDatabase } from 'expo-sqlite';

import { updateClimb, updatePitch, type ClimbPatch, type PitchPatch } from './climbs';

/**
 * Debounced writes for text fields, so each keystroke doesn't hit SQLite but nothing
 * typed is lost. `flushAll` runs when the app goes to the background.
 */
type Pending = { timer: ReturnType<typeof setTimeout>; run: () => Promise<void> };

const pending = new Map<string, Pending>();
const DELAY_MS = 300;

function schedule(key: string, run: () => Promise<void>) {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(key);
    void run();
  }, DELAY_MS);
  pending.set(key, { timer, run });
}

const climbPatches = new Map<string, ClimbPatch>();
const pitchPatches = new Map<string, PitchPatch>();

export function scheduleClimbUpdate(db: SQLiteDatabase, id: string, patch: ClimbPatch) {
  const key = `climb:${id}`;
  climbPatches.set(key, { ...climbPatches.get(key), ...patch });
  schedule(key, async () => {
    const merged = climbPatches.get(key);
    climbPatches.delete(key);
    if (merged) await updateClimb(db, id, merged);
  });
}

export function schedulePitchUpdate(db: SQLiteDatabase, climbId: string, number: number, patch: PitchPatch) {
  const key = `pitch:${climbId}:${number}`;
  pitchPatches.set(key, { ...pitchPatches.get(key), ...patch });
  schedule(key, async () => {
    const merged = pitchPatches.get(key);
    pitchPatches.delete(key);
    if (merged) await updatePitch(db, climbId, number, merged);
  });
}

/** Writes everything still waiting. Safe to call any time. */
export async function flushAll(): Promise<void> {
  const runs = [...pending.values()];
  pending.clear();
  for (const p of runs) clearTimeout(p.timer);
  await Promise.all(runs.map((p) => p.run()));
}
