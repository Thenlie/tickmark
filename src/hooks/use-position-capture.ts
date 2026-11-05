import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

/** Stop on its own once the fix is this good. */
export const GOOD_ACCURACY_M = 10;
/** Above this, warn that the fix is weak. Never blocks saving. */
export const WEAK_ACCURACY_M = 25;
/** After this long the user may accept whatever fix they have. */
export const ACCEPT_AFTER_MS = 5000;

export type Fix = { lat: number; lng: number; accuracyM: number | null; at: number };

export type CaptureState =
  | { phase: 'idle' }
  | { phase: 'denied'; canAskAgain: boolean }
  | { phase: 'locating'; fix: Fix | null; canAccept: boolean }
  | { phase: 'error'; message: string };

/**
 * Watches GPS at the highest accuracy until the fix is good enough, then hands it to
 * `onFix`. GPS needs no cell signal, so this works at the crag.
 */
export function usePositionCapture(onFix: (fix: Fix) => void) {
  const [state, setState] = useState<CaptureState>({ phase: 'idle' });
  const sub = useRef<Location.LocationSubscription | null>(null);
  const latest = useRef<Fix | null>(null);
  const acceptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    sub.current?.remove();
    sub.current = null;
    if (acceptTimer.current) clearTimeout(acceptTimer.current);
    acceptTimer.current = null;
  };

  useEffect(() => stop, []);

  const finish = (fix: Fix) => {
    stop();
    latest.current = null;
    setState({ phase: 'idle' });
    onFix(fix);
  };

  const start = async () => {
    stop();
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      setState({ phase: 'denied', canAskAgain: perm.canAskAgain });
      return;
    }
    latest.current = null;
    setState({ phase: 'locating', fix: null, canAccept: false });
    acceptTimer.current = setTimeout(() => {
      acceptTimer.current = null;
      setState((s) => (s.phase === 'locating' ? { ...s, canAccept: s.fix !== null } : s));
    }, ACCEPT_AFTER_MS);

    try {
      sub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const fix: Fix = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            accuracyM: loc.coords.accuracy,
            at: loc.timestamp,
          };
          const prev = latest.current;
          // Keep the best fix seen so far; readings can get worse as well as better.
          if (!prev || (fix.accuracyM ?? Infinity) <= (prev.accuracyM ?? Infinity)) latest.current = fix;
          const best = latest.current!;
          if (best.accuracyM !== null && best.accuracyM <= GOOD_ACCURACY_M) {
            finish(best);
            return;
          }
          setState((s) =>
            s.phase === 'locating' ? { ...s, fix: best, canAccept: s.canAccept || acceptTimer.current === null } : s,
          );
        },
        (message) => {
          stop();
          setState({ phase: 'error', message });
        },
      );
    } catch (e) {
      stop();
      setState({ phase: 'error', message: e instanceof Error ? e.message : 'Location unavailable' });
    }
  };

  const accept = () => {
    if (latest.current) finish(latest.current);
  };

  const cancel = () => {
    stop();
    setState({ phase: 'idle' });
  };

  return { state, start, accept, cancel };
}

/** A quiet, low-power fix for sorting nearby crags. Returns null rather than prompting or failing loudly. */
export async function quickPosition(): Promise<{ lat: number; lng: number } | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const loc =
      (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}
