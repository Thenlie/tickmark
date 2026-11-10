import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { defaultSystem } from '@/climb/grades';
import type { Climb, Discipline, Kind, Pitch, SyncState } from '@/climb/types';

type ClimbRow = {
  id: string;
  created_at: number;
  updated_at: number;
  kind: string;
  disciplines: string;
  area_id: string | null;
  name: string;
  grade_system: string;
  grade: string | null;
  safety: string | null;
  aid_grade: string | null;
  mixed_grade: string | null;
  commitment: string | null;
  length_m: number | null;
  bolts: number | null;
  fa: string;
  description: string;
  approach: string;
  protection: string;
  lat: number | null;
  lng: number | null;
  gps_accuracy_m: number | null;
  gps_at: number | null;
  sync_state: string;
  sync_error: string | null;
  submitted_version: number | null;
};

type PitchRow = {
  climb_id: string;
  number: number;
  grade: string | null;
  length_m: number | null;
  bolts: number | null;
  disciplines: string;
  description: string;
};

/** Climb field name → column name. Also the allow-list for `updateClimb`. */
const CLIMB_COLUMNS = {
  kind: 'kind',
  disciplines: 'disciplines',
  areaId: 'area_id',
  name: 'name',
  gradeSystem: 'grade_system',
  grade: 'grade',
  safety: 'safety',
  aidGrade: 'aid_grade',
  mixedGrade: 'mixed_grade',
  commitment: 'commitment',
  lengthM: 'length_m',
  bolts: 'bolts',
  fa: 'fa',
  description: 'description',
  approach: 'approach',
  protection: 'protection',
  lat: 'lat',
  lng: 'lng',
  gpsAccuracyM: 'gps_accuracy_m',
  gpsAt: 'gps_at',
} as const satisfies Partial<Record<keyof Climb, string>>;

export type ClimbPatch = Partial<Pick<Climb, keyof typeof CLIMB_COLUMNS>>;

const PITCH_COLUMNS = {
  grade: 'grade',
  lengthM: 'length_m',
  bolts: 'bolts',
  disciplines: 'disciplines',
  description: 'description',
} as const satisfies Partial<Record<keyof Pitch, string>>;

export type PitchPatch = Partial<Pick<Pitch, keyof typeof PITCH_COLUMNS>>;

function toClimb(r: ClimbRow): Climb {
  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    kind: r.kind as Climb['kind'],
    disciplines: JSON.parse(r.disciplines) as Discipline[],
    areaId: r.area_id,
    name: r.name,
    gradeSystem: r.grade_system as Climb['gradeSystem'],
    grade: r.grade,
    safety: r.safety as Climb['safety'],
    aidGrade: r.aid_grade,
    mixedGrade: r.mixed_grade,
    commitment: r.commitment,
    lengthM: r.length_m,
    bolts: r.bolts,
    fa: r.fa,
    description: r.description,
    approach: r.approach,
    protection: r.protection,
    lat: r.lat,
    lng: r.lng,
    gpsAccuracyM: r.gps_accuracy_m,
    gpsAt: r.gps_at,
    syncState: r.sync_state as SyncState,
    syncError: r.sync_error,
    submittedVersion: r.submitted_version,
  };
}

function toPitch(r: PitchRow): Pitch {
  return {
    climbId: r.climb_id,
    number: r.number,
    grade: r.grade,
    lengthM: r.length_m,
    bolts: r.bolts,
    disciplines: JSON.parse(r.disciplines) as Discipline[],
    description: r.description,
  };
}

function toSqlValue(value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value as string | number;
}

/**
 * A draft nobody has edited yet. Every user edit bumps `updated_at`, so a climb whose
 * `updated_at` still equals `created_at` holds nothing the user chose.
 */
const UNTOUCHED = 'updated_at = created_at';

/**
 * Starts a new draft, reusing the grade system of the user's last climb of the same kind.
 * It stays hidden from the list until the user edits it.
 */
export async function createDraft(db: SQLiteDatabase, kind: Kind = 'rope'): Promise<string> {
  const last = await db.getFirstAsync<{ kind: string; grade_system: string }>(
    `SELECT kind, grade_system FROM climbs WHERE NOT (${UNTOUCHED}) ORDER BY updated_at DESC LIMIT 1`,
  );
  const startKind = (last?.kind as Kind | undefined) ?? kind;
  const gradeSystem = last?.grade_system ?? defaultSystem(startKind, null);
  const disciplines: Discipline[] =
    startKind === 'boulder' ? ['bouldering'] : startKind === 'ice' ? ['ice'] : ['sport'];

  const id = randomUUID();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO climbs (id, created_at, updated_at, kind, disciplines, grade_system)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    now,
    now,
    startKind,
    JSON.stringify(disciplines),
    gradeSystem,
  );
  return id;
}

export async function getClimb(db: SQLiteDatabase, id: string): Promise<Climb | null> {
  const row = await db.getFirstAsync<ClimbRow>('SELECT * FROM climbs WHERE id = ?', id);
  return row ? toClimb(row) : null;
}

export async function listClimbs(db: SQLiteDatabase): Promise<Climb[]> {
  const rows = await db.getAllAsync<ClimbRow>(
    `SELECT * FROM climbs WHERE NOT (${UNTOUCHED}) ORDER BY updated_at DESC`,
  );
  return rows.map(toClimb);
}

export async function updateClimb(db: SQLiteDatabase, id: string, patch: ClimbPatch): Promise<void> {
  const entries = Object.entries(patch).filter(([key]) => key in CLIMB_COLUMNS);
  if (entries.length === 0) return;
  const sets = entries.map(([key]) => `${CLIMB_COLUMNS[key as keyof typeof CLIMB_COLUMNS]} = ?`);
  await db.runAsync(
    `UPDATE climbs SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`,
    ...entries.map(([, value]) => toSqlValue(value)),
    Date.now(),
    id,
  );
}

/*
 * Sync state changes don't bump `updated_at`: they aren't edits, and `submitted_version`
 * is compared against it to spot changes made after a send.
 */

/** Queues a climb for sending. Clears any earlier rejection so the user sees it retry. */
export async function queueSubmission(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(`UPDATE climbs SET sync_state = 'pending', sync_error = NULL WHERE id = ?`, id);
}

export async function listPendingClimbIds(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM climbs WHERE sync_state = 'pending' ORDER BY updated_at`,
  );
  return rows.map((r) => r.id);
}

/** Records a send OpenBeta accepted. `version` is the `updatedAt` of the data that was sent. */
export async function markSubmitted(db: SQLiteDatabase, id: string, version: number): Promise<void> {
  await db.runAsync(
    `UPDATE climbs SET sync_state = 'submitted', sync_error = NULL, submitted_version = ? WHERE id = ?`,
    version,
    id,
  );
}

export async function markFailed(db: SQLiteDatabase, id: string, error: string): Promise<void> {
  await db.runAsync(`UPDATE climbs SET sync_state = 'failed', sync_error = ? WHERE id = ?`, error, id);
}

/** Removes drafts that were opened but never edited. */
export async function deleteUntouchedDrafts(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`DELETE FROM climbs WHERE ${UNTOUCHED}`);
}

export async function deleteClimb(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM climbs WHERE id = ?', id);
}

export async function listPitches(db: SQLiteDatabase, climbId: string): Promise<Pitch[]> {
  const rows = await db.getAllAsync<PitchRow>(
    'SELECT * FROM pitches WHERE climb_id = ? ORDER BY number',
    climbId,
  );
  return rows.map(toPitch);
}

export async function listAllPitches(db: SQLiteDatabase): Promise<Pitch[]> {
  const rows = await db.getAllAsync<PitchRow>('SELECT * FROM pitches ORDER BY climb_id, number');
  return rows.map(toPitch);
}

/**
 * Sets the number of pitches. Adds empty pitches or drops the last ones.
 * Going from 1 to 2 also creates pitch 1, seeded from the climb's own grade and length.
 */
export async function setPitchCount(db: SQLiteDatabase, climb: Climb, count: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    const existing = await listPitches(db, climb.id);
    if (count <= 1) {
      await db.runAsync('DELETE FROM pitches WHERE climb_id = ?', climb.id);
    } else {
      for (let n = existing.length + 1; n <= count; n++) {
        const seed = n === 1 && existing.length === 0;
        await db.runAsync(
          `INSERT INTO pitches (climb_id, number, grade, length_m, disciplines) VALUES (?, ?, ?, ?, ?)`,
          climb.id,
          n,
          seed ? climb.grade : null,
          seed ? climb.lengthM : null,
          JSON.stringify(climb.disciplines),
        );
      }
      await db.runAsync('DELETE FROM pitches WHERE climb_id = ? AND number > ?', climb.id, count);
    }
    await db.runAsync('UPDATE climbs SET updated_at = ? WHERE id = ?', Date.now(), climb.id);
  });
}

export async function updatePitch(
  db: SQLiteDatabase,
  climbId: string,
  number: number,
  patch: PitchPatch,
): Promise<void> {
  const entries = Object.entries(patch).filter(([key]) => key in PITCH_COLUMNS);
  if (entries.length === 0) return;
  const sets = entries.map(([key]) => `${PITCH_COLUMNS[key as keyof typeof PITCH_COLUMNS]} = ?`);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE pitches SET ${sets.join(', ')} WHERE climb_id = ? AND number = ?`,
      ...entries.map(([, value]) => toSqlValue(value)),
      climbId,
      number,
    );
    await db.runAsync('UPDATE climbs SET updated_at = ? WHERE id = ?', Date.now(), climbId);
  });
}

/** Removes one pitch and shifts the later ones down so numbers stay 1..n. */
export async function deletePitch(db: SQLiteDatabase, climbId: string, number: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM pitches WHERE climb_id = ? AND number = ?', climbId, number);
    // Two steps so the (climb_id, number) primary key never collides mid-update.
    await db.runAsync(
      'UPDATE pitches SET number = -(number - 1) WHERE climb_id = ? AND number > ?',
      climbId,
      number,
    );
    await db.runAsync('UPDATE pitches SET number = -number WHERE climb_id = ? AND number < 0', climbId);
    const left = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM pitches WHERE climb_id = ?',
      climbId,
    );
    if ((left?.n ?? 0) === 1) await db.runAsync('DELETE FROM pitches WHERE climb_id = ?', climbId);
    await db.runAsync('UPDATE climbs SET updated_at = ? WHERE id = ?', Date.now(), climbId);
  });
}
