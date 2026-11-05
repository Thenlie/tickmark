import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Photo } from '@/climb/types';

type PhotoRow = {
  id: string;
  climb_id: string;
  path: string;
  position: number;
  caption: string;
  created_at: number;
};

function toPhoto(r: PhotoRow): Photo {
  return {
    id: r.id,
    climbId: r.climb_id,
    path: r.path,
    position: r.position,
    caption: r.caption,
    createdAt: r.created_at,
  };
}

function climbPhotoDir(climbId: string) {
  return new Directory(Paths.document, 'photos', climbId);
}

/** Full file URI for a stored photo. Paths are stored relative so they survive app container moves. */
export function photoUri(photo: Photo): string {
  return new File(Paths.document, photo.path).uri;
}

export async function listPhotos(db: SQLiteDatabase, climbId: string): Promise<Photo[]> {
  const rows = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM photos WHERE climb_id = ? ORDER BY position',
    climbId,
  );
  return rows.map(toPhoto);
}

/**
 * Copies a picked image into the app's document directory, which the OS doesn't clear,
 * and records it. The picker's own URI may point into a cache.
 */
export async function addPhoto(db: SQLiteDatabase, climbId: string, sourceUri: string): Promise<void> {
  const dir = climbPhotoDir(climbId);
  if (!dir.exists) dir.create({ intermediates: true });

  const id = randomUUID();
  const ext = sourceUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const relativePath = `photos/${climbId}/${id}.${ext}`;
  await new File(sourceUri).copy(new File(Paths.document, relativePath));

  const last = await db.getFirstAsync<{ p: number | null }>(
    'SELECT MAX(position) AS p FROM photos WHERE climb_id = ?',
    climbId,
  );
  await db.runAsync(
    'INSERT INTO photos (id, climb_id, path, position, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    climbId,
    relativePath,
    (last?.p ?? -1) + 1,
    Date.now(),
  );
  await db.runAsync('UPDATE climbs SET updated_at = ? WHERE id = ?', Date.now(), climbId);
}

export async function removePhoto(db: SQLiteDatabase, photo: Photo): Promise<void> {
  await db.runAsync('DELETE FROM photos WHERE id = ?', photo.id);
  const file = new File(Paths.document, photo.path);
  if (file.exists) file.delete();
}

/** Deletes every stored photo file for a climb. Rows go with the climb via ON DELETE CASCADE. */
export function deleteClimbPhotoFiles(climbId: string) {
  const dir = climbPhotoDir(climbId);
  if (dir.exists) dir.delete();
}
