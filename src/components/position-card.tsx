import { Linking, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Climb } from '@/climb/types';
import { Spacing } from '@/constants/theme';
import { WEAK_ACCURACY_M, usePositionCapture, type Fix } from '@/hooks/use-position-capture';
import { useTheme } from '@/hooks/use-theme';

function formatCoord(n: number) {
  return n.toFixed(5).replace('-', '−');
}

/** "Log my location" button and the saved fix. Suggested, never required. */
export function PositionCard({ climb, onFix }: { climb: Climb; onFix: (fix: Fix) => void }) {
  const theme = useTheme();
  const { state, start, accept, cancel } = usePositionCapture(onFix);
  const has = climb.lat !== null && climb.lng !== null;

  if (state.phase === 'locating') {
    const acc = state.fix?.accuracyM;
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Finding your position…</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {acc != null ? `±${Math.round(acc)} m so far` : 'Waiting for GPS'}
          {acc != null && acc > WEAK_ACCURACY_M ? ' · weak fix, step away from the wall or wait' : ''}
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.actions}>
          <Action label="Cancel" onPress={cancel} secondary />
          {state.canAccept && <Action label="Use this fix" onPress={accept} />}
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={[styles.card, has && { borderColor: theme.primary }]}>
      {has ? (
        <>
          <ThemedText type="code">
            {formatCoord(climb.lat!)}, {formatCoord(climb.lng!)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {climb.gpsAccuracyM != null ? `±${Math.round(climb.gpsAccuracyM)} m` : 'accuracy unknown'}
            {climb.gpsAt ? ` · ${new Date(climb.gpsAt).toLocaleString()}` : ''}
          </ThemedText>
          {climb.gpsAccuracyM != null && climb.gpsAccuracyM > WEAK_ACCURACY_M && (
            <ThemedText type="small" themeColor="textSecondary">
              Weak fix. Retake at the base of the climb if you can.
            </ThemedText>
          )}
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Stand at the base of the climb and log your position. Works without signal.
        </ThemedText>
      )}
      {state.phase === 'denied' && (
        <ThemedText type="small" themeColor="textSecondary">
          Location access is off for Tickmark.{' '}
          {!state.canAskAgain && (
            <ThemedText type="smallBold" onPress={() => Linking.openSettings()}>
              Open settings
            </ThemedText>
          )}
        </ThemedText>
      )}
      {state.phase === 'error' && (
        <ThemedText type="small" themeColor="textSecondary">
          {`Couldn't get a position: ${state.message}`}
        </ThemedText>
      )}
      <ThemedView type="backgroundElement" style={styles.actions}>
        <Action label={has ? 'Retake' : 'Log my location'} onPress={start} />
      </ThemedView>
    </ThemedView>
  );
}

function Action({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="smallBold" themeColor={secondary ? 'textSecondary' : 'primary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
