import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changeKind, disciplinesFor } from '@/climb/grades';
import { DISCIPLINE_LABELS, KIND_LABELS, KINDS } from '@/climb/labels';
import type { Discipline } from '@/climb/types';
import { Chips, Segmented } from '@/components/choice';
import { FormField } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { updateClimb } from '@/db/climbs';
import { nearbyRemote } from '@/openbeta/area-cache';
import { useClimb } from '@/hooks/use-climb';
import { quickPosition } from '@/hooks/use-position-capture';
import { useTheme } from '@/hooks/use-theme';

/** Screen A: what kind of climb, and which OpenBeta area it belongs to. */
export default function SetupScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bundle = useClimb(id);
  const [notice, setNotice] = useState<string | null>(null);

  // Warm the area cache with crags near the user while they pick a type. Silent offline.
  useEffect(() => {
    void quickPosition().then((pos) => pos && nearbyRemote(db, pos.lat, pos.lng).catch(() => {}));
  }, [db]);

  if (!bundle) return <ThemedView style={styles.flex} />;
  const { climb, area } = bundle;

  const finish = () => {
    if (from === 'details') router.back();
    else router.replace({ pathname: '/climb/[id]', params: { id } });
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
      <ThemedView style={styles.form}>
        <FormField label="Type">
          <Segmented
            value={climb.kind}
            options={KINDS}
            labels={KIND_LABELS}
            onChange={(kind) => {
              const { patch, notice } = changeKind(climb, kind, area?.gradeContext ?? null);
              setNotice(notice);
              void updateClimb(db, id, patch);
            }}
          />
          {notice && (
            <ThemedText type="small" themeColor="textSecondary">
              {notice}
            </ThemedText>
          )}
        </FormField>

        {climb.kind !== 'boulder' && (
          <FormField
            label="Disciplines"
            hint={
              climb.disciplines.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Pick at least one.
                </ThemedText>
              )
            }>
            <Chips<Discipline>
              value={climb.disciplines}
              options={disciplinesFor(climb.kind)}
              labels={DISCIPLINE_LABELS}
              onChange={(disciplines) => void updateClimb(db, id, { disciplines })}
            />
          </FormField>
        )}

        <FormField label="Where">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/climb/[id]/area', params: { id } })}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.areaRow}>
              {area ? (
                <>
                  <ThemedText>{area.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {area.pathTokens.slice(0, -1).join(' › ')}
                  </ThemedText>
                </>
              ) : (
                <ThemedText themeColor="textSecondary">Choose a crag or boulder</ThemedText>
              )}
            </ThemedView>
          </Pressable>
        </FormField>

        <Pressable
          accessibilityRole="button"
          onPress={finish}
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
          <ThemedText themeColor="onPrimary" type="smallBold">
            {from === 'details' ? 'Done' : 'Continue'}
          </ThemedText>
        </Pressable>
        {!area && (
          <Pressable accessibilityRole="button" onPress={finish} style={styles.later}>
            <ThemedText type="small" themeColor="textSecondary">
              Choose area later
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  form: { flexGrow: 1, maxWidth: MaxContentWidth, gap: Spacing.four, padding: Spacing.four },
  areaRow: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  primary: { alignItems: 'center', paddingVertical: Spacing.three, borderRadius: Spacing.three },
  later: { alignItems: 'center', paddingVertical: Spacing.two },
  pressed: { opacity: 0.7 },
});
