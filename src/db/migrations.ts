import type { SQLiteDatabase } from 'expo-sqlite';

/** Each entry moves the schema up one `user_version`. Append only; never edit a shipped step. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE climbs (
    id TEXT PRIMARY KEY NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    kind TEXT NOT NULL,
    disciplines TEXT NOT NULL DEFAULT '[]',
    area_id TEXT,
    name TEXT NOT NULL DEFAULT '',
    grade_system TEXT NOT NULL,
    grade TEXT,
    safety TEXT,
    aid_grade TEXT,
    mixed_grade TEXT,
    commitment TEXT,
    length_m INTEGER,
    bolts INTEGER,
    fa TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    approach TEXT NOT NULL DEFAULT '',
    protection TEXT NOT NULL DEFAULT '',
    lat REAL,
    lng REAL,
    gps_accuracy_m REAL,
    gps_at INTEGER
  );
  CREATE TABLE pitches (
    climb_id TEXT NOT NULL REFERENCES climbs(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    grade TEXT,
    length_m INTEGER,
    bolts INTEGER,
    disciplines TEXT NOT NULL DEFAULT '[]',
    description TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (climb_id, number)
  );
  CREATE TABLE photos (
    id TEXT PRIMARY KEY NOT NULL,
    climb_id TEXT NOT NULL REFERENCES climbs(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    position INTEGER NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX photos_climb ON photos (climb_id, position);
  CREATE TABLE areas (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT,
    ancestors TEXT NOT NULL DEFAULT '[]',
    path_tokens TEXT NOT NULL DEFAULT '[]',
    grade_context TEXT,
    is_leaf INTEGER NOT NULL DEFAULT 0,
    is_boulder INTEGER NOT NULL DEFAULT 0,
    lat REAL,
    lng REAL,
    fetched_at INTEGER NOT NULL,
    children_fetched_at INTEGER
  );
  CREATE INDEX areas_parent ON areas (parent_id);
  CREATE INDEX areas_name ON areas (name COLLATE NOCASE);
  CREATE TABLE area_climbs (
    area_id TEXT NOT NULL,
    climb_id TEXT NOT NULL,
    name TEXT NOT NULL,
    grade TEXT,
    PRIMARY KEY (area_id, climb_id)
  );
  `,
  `
  ALTER TABLE climbs ADD COLUMN sync_state TEXT NOT NULL DEFAULT 'local';
  ALTER TABLE climbs ADD COLUMN sync_error TEXT;
  ALTER TABLE climbs ADD COLUMN submitted_version INTEGER;
  `,
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[version]);
      await tx.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}
