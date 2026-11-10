import { router, useLocalSearchParams } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fieldsFor } from '@/climb/fields';
import { SYSTEM_LABELS } from '@/climb/grades';
import { KIND_LABELS, disciplineSummary } from '@/climb/labels';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { flushAll } from '@/db/autosave';
import { queueSubmission } from '@/db/climbs';
import { useClimb, type ClimbBundle } from '@/hooks/use-climb';
import { useTheme } from '@/hooks/use-theme';
import { unsentFields } from '@/openbeta/climb-input';
import { sendPendingClimbs } from '@/openbeta/submit-queue';

/** Shows exactly what will go to OpenBeta and sends it once the user confirms. */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bundle = useClimb(id);

  if (bundle === undefined) return <ThemedView style={styles.flex} />;
  if (bundle === null) {
    return (
      <ThemedView style={[styles.flex, styles.center]}>
        <ThemedText themeColor="textSecondary">This climb was deleted.</ThemedText>
      </ThemedView>
    );
  }
  return <Review bundle={bundle} />;
}

function Review({ bundle }: { bundle: ClimbBundle }) {
  const { climb, pitches, photos, area, status } = bundle;
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const network = useNetworkState();
  const [sending, setSending] = useState(false);

  const fields = fieldsFor(climb, pitches.length);
  const multiPitch = fields.pitches && pitches.length >= 2;
  const ready = status.status === 'ready';
  const offline = network.isInternetReachable === false || network.isConnected === false;
  const unsent = unsentFields(climb, pitches, photos.length);

  const send = async () => {
    setSending(true);
    await flushAll();
    await queueSubmission(db, climb.id);
    // Runs in the background; offline it just waits for the next connection.
    void sendPendingClimbs(db).catch(() => {});
    router.dismissTo('/');
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: (Platform.OS === 'android' ? insets.bottom : 0) + Spacing.four },
      ]}>
      <ThemedView style={styles.body}>
        <ThemedView style={styles.heading}>
          <ThemedText type="subtitle">{climb.name.trim() || 'Untitled climb'}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {[climb.kind === 'boulder' ? KIND_LABELS.boulder : disciplineSummary(climb.disciplines), climb.grade]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </ThemedView>

        {!ready && (
          <ThemedView type="backgroundElement" style={styles.notice}>
            <ThemedText type="smallBold" themeColor="danger">
              Can&apos;t send yet
            </ThemedText>
            <ThemedText type="small">Still needed: {status.missing.join(', ')}.</ThemedText>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          <Row label="Area" value={area ? area.pathTokens.join(' › ') : null} />
          <Row label="Type" value={climb.kind === 'boulder' ? KIND_LABELS.boulder : disciplineSummary(climb.disciplines)} />
          <Row
            label={multiPitch ? 'Overall grade' : 'Grade'}
            value={climb.grade ? `${climb.grade} (${SYSTEM_LABELS[climb.gradeSystem]})` : null}
          />
          {multiPitch && (
            <Row
              label="Pitches"
              value={pitches.map((p) => `P${p.number}: ${p.grade ?? 'no grade'}`).join('\n')}
            />
          )}
          <Row label={fields.lengthLabel} value={climb.lengthM != null ? `${climb.lengthM} m` : null} />
          {fields.bolts && <Row label="Bolts" value={climb.bolts != null ? String(climb.bolts) : null} />}
          <Row label="Description" value={climb.description} />
          <Row label="Approach" value={climb.approach} />
          <Row label="Protection" value={climb.protection} />
          <Row label="First ascent" value={climb.fa} last />
        </ThemedView>

        {unsent.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            OpenBeta doesn&apos;t take {unsent.join(', ')} yet. They stay on this phone.
          </ThemedText>
        )}

        <ThemedText type="small" themeColor="textSecondary">
          {offline
            ? "You're offline. Tickmark will send this climb when you have a connection."
            : 'Check everything is right. This climb will be public on OpenBeta.'}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready || sending }}
          disabled={!ready || sending}
          onPress={send}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: ready ? theme.primary : theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" themeColor={ready ? 'onPrimary' : 'textSecondary'}>
            {offline ? 'Send when online' : 'Send to OpenBeta'}
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.secondary}>
          <ThemedText type="small" themeColor="primary">
            Keep editing
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

function Row({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  const theme = useTheme();
  const empty = value === null || value.trim() === '';
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.row, !last && { borderBottomColor: theme.backgroundSelected, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor={empty ? 'textSecondary' : 'text'}>
        {empty ? '—' : value.trim()}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', justifyContent: 'center' },
  body: { flexGrow: 1, maxWidth: MaxContentWidth, gap: Spacing.three, padding: Spacing.four },
  heading: { gap: Spacing.one },
  notice: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
  card: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three },
  row: { gap: Spacing.half, paddingVertical: Spacing.two + Spacing.one },
  primary: { alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Spacing.three },
  secondary: { alignItems: 'center', paddingVertical: Spacing.two },
  pressed: { opacity: 0.7 },
});
