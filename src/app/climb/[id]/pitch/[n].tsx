import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GRADE_SCALES, SYSTEM_LABELS, disciplinesFor } from '@/climb/grades';
import { DISCIPLINE_LABELS } from '@/climb/labels';
import type { Discipline } from '@/climb/types';
import { Chips } from '@/components/choice';
import { DraftInput, FormField, NumberInput, SelectInput } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { flushAll, schedulePitchUpdate } from '@/db/autosave';
import { deletePitch, updatePitch, type PitchPatch } from '@/db/climbs';
import { useClimb } from '@/hooks/use-climb';
import { useTheme } from '@/hooks/use-theme';

/** Details for one pitch of a multi-pitch climb. Maps to OpenBeta's `Pitch`. */
export default function PitchScreen() {
  const { id, n } = useLocalSearchParams<{ id: string; n: string }>();
  const number = Number(n);
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bundle = useClimb(id);

  useEffect(() => () => void flushAll(), []);

  const pitch = bundle?.pitches.find((p) => p.number === number);
  if (!bundle || !pitch) return <ThemedView style={styles.flex} />;
  const { climb } = bundle;

  const set = (patch: PitchPatch) => void updatePitch(db, id, number, patch);
  const type = (patch: PitchPatch) => schedulePitchUpdate(db, id, number, patch);

  const remove = async () => {
    await flushAll();
    await deletePitch(db, id, number);
    router.back();
  };

  return (
    <ScrollView
      key={`${id}-${number}`}
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: (Platform.OS === 'android' ? insets.bottom : 0) + Spacing.four },
      ]}>
      <Stack.Screen options={{ title: `Pitch ${number} of ${bundle.pitches.length}` }} />
      <ThemedView style={styles.form}>
        <ThemedView style={styles.pair}>
          <ThemedView style={styles.flex}>
            <FormField label={`Grade (${SYSTEM_LABELS[climb.gradeSystem]})`}>
              <SelectInput
                value={pitch.grade}
                options={GRADE_SCALES[climb.gradeSystem]}
                onChange={(grade) => set({ grade })}
              />
            </FormField>
          </ThemedView>
          <ThemedView style={styles.flex}>
            <FormField label="Length (m)">
              <NumberInput initialValue={pitch.lengthM} onChange={(lengthM) => type({ lengthM })} placeholder="m" />
            </FormField>
          </ThemedView>
        </ThemedView>

        <FormField label="Style">
          <Chips<Discipline>
            value={pitch.disciplines}
            options={disciplinesFor(climb.kind)}
            labels={DISCIPLINE_LABELS}
            onChange={(disciplines) => set({ disciplines })}
          />
        </FormField>

        {pitch.disciplines.includes('sport') && (
          <FormField label="Bolts">
            <NumberInput initialValue={pitch.bolts} onChange={(bolts) => type({ bolts })} placeholder="#" />
          </FormField>
        )}

        <FormField label="Pitch description">
          <DraftInput
            initialValue={pitch.description}
            onChange={(description) => type({ description })}
            placeholder="Moves, belay, gear for this pitch"
            multiline
          />
        </FormField>

        <ThemedView style={styles.nav}>
          {number > 1 ? (
            <NavLink label={`‹ Pitch ${number - 1}`} onPress={() => router.setParams({ n: String(number - 1) })} />
          ) : (
            <ThemedView />
          )}
          {number < bundle.pitches.length && (
            <NavLink label={`Pitch ${number + 1} ›`} onPress={() => router.setParams({ n: String(number + 1) })} />
          )}
        </ThemedView>

        <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}>
          <ThemedText type="small" themeColor="textSecondary">
            Remove this pitch
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void flushAll().then(onPress)}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedText type="smallBold" themeColor="primary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  form: { flexGrow: 1, maxWidth: MaxContentWidth, gap: Spacing.four, padding: Spacing.four },
  pair: { flexDirection: 'row', gap: Spacing.three },
  nav: { flexDirection: 'row', justifyContent: 'space-between' },
  delete: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.7 },
});
