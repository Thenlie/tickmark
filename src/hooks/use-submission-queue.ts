import { addNetworkStateListener } from 'expo-network';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { sendPendingClimbs } from '@/openbeta/submit-queue';

/** Sends queued climbs at launch, when the app comes back to the foreground and when a connection returns. */
export function useSubmissionQueue() {
  const db = useSQLiteContext();

  useEffect(() => {
    const send = () => void sendPendingClimbs(db).catch(() => {});
    send();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') send();
    });
    const network = addNetworkStateListener((state) => {
      if (state.isInternetReachable ?? state.isConnected) send();
    });
    return () => {
      appState.remove();
      network.remove();
    };
  }, [db]);
}
