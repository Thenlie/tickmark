import { addDatabaseChangeListener, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useEffectEvent, useState } from 'react';

/**
 * Runs `load` now and again whenever one of `tables` changes. Requires the provider to
 * open the database with `enableChangeListener: true`. `key` restarts the query when
 * its inputs change (e.g. the climb id).
 */
export function useDbQuery<T>(
  load: (db: SQLiteDatabase) => Promise<T>,
  tables: string[],
  key: string,
): { data: T | undefined } {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  const run = useEffectEvent(() => load(db));
  const tablesKey = tables.join(',');

  useEffect(() => {
    let cancelled = false;
    let queued: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      run().then((value) => {
        if (!cancelled) setData(value);
      });
    };
    refresh();

    const watched = tablesKey.split(',');
    const sub = addDatabaseChangeListener((event) => {
      if (!watched.includes(event.tableName) || queued) return;
      // Coalesce bursts (e.g. a transaction touching many rows) into one reload.
      queued = setTimeout(() => {
        queued = null;
        refresh();
      }, 50);
    });
    return () => {
      cancelled = true;
      sub.remove();
      if (queued) clearTimeout(queued);
    };
  }, [db, tablesKey, key]);

  return { data };
}
