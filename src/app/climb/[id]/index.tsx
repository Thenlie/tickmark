import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fieldsFor } from '@/climb/fields';
import {
  AID_GRADES,
  COMMITMENT_GRADES,
  GRADE_SCALES,
  MIXED_GRADES,
  SAFETY_RATINGS,
  SYSTEM_LABELS,
  isValidGrade,
  systemsFor,
} from '@/climb/grades';
import { KIND_LABELS, SAFETY_LABELS, disciplineSummary } from '@/climb/labels';
import { hardestPitchGrade, totalPitchLength } from '@/climb/pitches';
import { findSimilarName } from '@/climb/similar-name';
import type { GradeSystem } from '@/climb/types';
import { Stepper } from '@/components/choice';
import { confirmDeleteClimb } from '@/components/confirm-delete-climb';
import { DraftInput, FormField, NumberInput, SectionTitle, SelectInput } from '@/components/form';
import { PhotoStrip } from '@/components/photo-strip';
import { PositionCard } from '@/components/position-card';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { listAreaClimbs, type AreaClimb } from '@/db/areas';
import { flushAll, scheduleClimbUpdate } from '@/db/autosave';
import { setPitchCount, updateClimb, type ClimbPatch } from '@/db/climbs';
import { useClimb, type ClimbBundle } from '@/hooks/use-climb';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';

/** Screen B: everything else about the climb. Every change is saved as it happens. */
export default function ClimbDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bundle = useClimb(id);

  // Flush debounced text when leaving the screen.
  useEffect(() => () => void flushAll(), []);

  if (bundle === undefined) return <ThemedView style={styles.flex} />;
  if (bundle === null) {
    return (
      <ThemedView style={[styles.flex, styles.center]}>
        <ThemedText themeColor="textSecondary">This climb was deleted.</ThemedText>
      </ThemedView>
    );
  }
  // Keyed so text inputs re-read their initial values if a different climb is shown.
  return <DetailsForm key={bundle.climb.id} bundle={bundle} />;
}

function DetailsForm({ bundle }: { bundle: ClimbBundle }) {
  const { climb, pitches, photos, area, status } = bundle;
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const fields = fieldsFor(climb, pitches.length);
  const multiPitch = pitches.length >= 2;

  const set = (patch: ClimbPatch) => void updateClimb(db, climb.id, patch);
  const type = (patch: ClimbPatch) => scheduleClimbUpdate(db, climb.id, patch);

  const [name, setName] = useState(climb.name);
  // Bumped only when a button sets the length, so the input re-reads it without losing focus while typing.
  const [lengthKey, setLengthKey] = useState(0);
  const areaId = climb.areaId;
  const { data: areaClimbs } = useDbQuery<AreaClimb[]>(
    (db) => (areaId ? listAreaClimbs(db, areaId) : Promise.resolve([])),
    ['area_climbs'],
    areaId ?? '',
  );
  const similar = findSimilarName(name, areaClimbs ?? []);

  const scale = GRADE_SCALES[climb.gradeSystem];
  const systems = systemsFor(climb.kind);
  const hardest = multiPitch ? hardestPitchGrade(climb.gradeSystem, pitches) : null;
  const pitchLength = multiPitch ? totalPitchLength(pitches) : null;

  const changeSystem = (gradeSystem: GradeSystem | null) => {
    if (!gradeSystem) return;
    set({ gradeSystem, grade: isValidGrade(gradeSystem, climb.grade) ? climb.grade : null });
  };

  const changePitchCount = async (count: number) => {
    await flushAll();
    await setPitchCount(db, climb, count);
  };

  const confirmDelete = () => confirmDeleteClimb(db, climb.id, { onDeleted: () => router.back() });

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: (Platform.OS === 'android' ? insets.bottom : 0) + Spacing.four },
      ]}>
      <Stack.Screen options={{ title: climb.kind === 'boulder' ? 'Boulder problem' : 'Route' }} />
      <ThemedView style={styles.form}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Change type or area"
          onPress={() => router.push({ pathname: '/climb/[id]/setup', params: { id: climb.id, from: 'details' } })}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.context}>
            <ThemedView type="backgroundSelected" style={styles.flex}>
              <ThemedText type="smallBold">
                {climb.kind === 'boulder' ? KIND_LABELS.boulder : disciplineSummary(climb.disciplines) || KIND_LABELS[climb.kind]}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {area ? area.pathTokens.slice(-2).join(' › ') : 'No area yet'}
              </ThemedText>
            </ThemedView>
            <ThemedText type="smallBold" themeColor="primary">
              Edit
            </ThemedText>
          </ThemedView>
        </Pressable>

        <FormField
          label="Name"
          hint={
            similar && (
              <ThemedText type="small" themeColor="primary">
                Similar name at this crag: {similar.name}
                {similar.grade ? ` (${similar.grade})` : ''}. {"Check it isn't already in OpenBeta."}
              </ThemedText>
            )
          }>
          <DraftInput
            initialValue={climb.name}
            onChange={(v) => {
              setName(v);
              type({ name: v });
            }}
            placeholder="e.g. Chalk Dust Tango"
            autoCapitalize="words"
          />
        </FormField>

        <ThemedView style={styles.pair}>
          <ThemedView style={styles.flex}>
            <FormField
              label={multiPitch ? 'Overall grade' : 'Grade'}
              hint={
                hardest &&
                hardest !== climb.grade && (
                  <Pressable onPress={() => set({ grade: hardest })} accessibilityRole="button">
                    <ThemedText type="small" themeColor="primary">
                      Use hardest pitch: {hardest}
                    </ThemedText>
                  </Pressable>
                )
              }>
              <SelectInput value={climb.grade} options={scale} onChange={(grade) => set({ grade })} />
            </FormField>
          </ThemedView>
          {systems.length > 1 && (
            <ThemedView style={styles.flex}>
              <FormField label="Scale">
                <SelectInput<GradeSystem>
                  value={climb.gradeSystem}
                  options={systems}
                  labels={SYSTEM_LABELS}
                  onChange={changeSystem}
                  allowClear={false}
                />
              </FormField>
            </ThemedView>
          )}
        </ThemedView>

        {fields.pitches && (
          <FormField label="Pitches">
            <Stepper value={Math.max(pitches.length, 1)} onChange={changePitchCount} />
            {multiPitch &&
              pitches.map((p) => (
                <Pressable
                  key={p.number}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/climb/[id]/pitch/[n]', params: { id: climb.id, n: String(p.number) } })
                  }
                  style={({ pressed }) => pressed && styles.pressed}>
                  <ThemedView type="backgroundElement" style={styles.pitchRow}>
                    <ThemedText type="smallBold">P{p.number}</ThemedText>
                    <ThemedText type="small" themeColor={p.grade ? 'text' : 'textSecondary'} style={styles.flex}>
                      {[p.grade ?? 'No grade', p.lengthM != null ? `${p.lengthM} m` : null].filter(Boolean).join(' · ')}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      ›
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
          </FormField>
        )}

        <ThemedView style={styles.pair}>
          <ThemedView style={styles.flex}>
            <FormField
              label={fields.lengthLabel}
              hint={
                pitchLength !== null &&
                pitchLength !== climb.lengthM && (
                  <Pressable
                    onPress={() => {
                      set({ lengthM: pitchLength });
                      setLengthKey((k) => k + 1);
                    }}
                    accessibilityRole="button">
                    <ThemedText type="small" themeColor="primary">
                      Use pitch total: {pitchLength} m
                    </ThemedText>
                  </Pressable>
                )
              }>
              <NumberInput
                key={lengthKey}
                initialValue={climb.lengthM}
                onChange={(lengthM) => type({ lengthM })}
                placeholder="m"
              />
            </FormField>
          </ThemedView>
          {fields.bolts && (
            <ThemedView style={styles.flex}>
              <FormField label="Bolts">
                <NumberInput initialValue={climb.bolts} onChange={(bolts) => type({ bolts })} placeholder="#" />
              </FormField>
            </ThemedView>
          )}
        </ThemedView>

        {(fields.safety || fields.aidGrade || fields.mixedGrade || fields.commitment) && (
          <ThemedView style={styles.grid}>
            {fields.safety && (
              <ThemedView style={styles.gridItem}>
                <FormField label="Safety">
                  <SelectInput
                    value={climb.safety}
                    options={SAFETY_RATINGS}
                    labels={SAFETY_LABELS}
                    onChange={(safety) => set({ safety })}
                    placeholder="Not rated"
                  />
                </FormField>
              </ThemedView>
            )}
            {fields.aidGrade && (
              <ThemedView style={styles.gridItem}>
                <FormField label="Aid grade">
                  <SelectInput value={climb.aidGrade} options={AID_GRADES} onChange={(aidGrade) => set({ aidGrade })} />
                </FormField>
              </ThemedView>
            )}
            {fields.mixedGrade && (
              <ThemedView style={styles.gridItem}>
                <FormField label="Mixed grade">
                  <SelectInput
                    value={climb.mixedGrade}
                    options={MIXED_GRADES}
                    onChange={(mixedGrade) => set({ mixedGrade })}
                  />
                </FormField>
              </ThemedView>
            )}
            {fields.commitment && (
              <ThemedView style={styles.gridItem}>
                <FormField label="Commitment">
                  <SelectInput
                    value={climb.commitment}
                    options={COMMITMENT_GRADES}
                    onChange={(commitment) => set({ commitment })}
                  />
                </FormField>
              </ThemedView>
            )}
          </ThemedView>
        )}

        <SectionTitle>Position</SectionTitle>
        <PositionCard
          climb={climb}
          onFix={(fix) => set({ lat: fix.lat, lng: fix.lng, gpsAccuracyM: fix.accuracyM, gpsAt: fix.at })}
        />

        <SectionTitle>Photos</SectionTitle>
        <PhotoStrip climbId={climb.id} photos={photos} />

        <SectionTitle>Details</SectionTitle>
        <FormField label="Description">
          <DraftInput
            initialValue={climb.description}
            onChange={(description) => type({ description })}
            placeholder="Line, features, beta"
            multiline
          />
        </FormField>
        <FormField label="Approach">
          <DraftInput
            initialValue={climb.approach}
            onChange={(approach) => type({ approach })}
            placeholder="How to find the start"
            multiline
          />
        </FormField>
        <FormField label="Protection">
          <DraftInput
            initialValue={climb.protection}
            onChange={(protection) => type({ protection })}
            placeholder={fields.protectionPlaceholder}
            multiline
          />
        </FormField>
        <FormField label="First ascent">
          <DraftInput
            initialValue={climb.fa}
            onChange={(fa) => type({ fa })}
            placeholder="Who and when, if known"
          />
        </FormField>

        <ThemedView style={styles.footer}>
          <StatusChip status={status} />
          {status.missing.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Still needed: {status.missing.join(', ')}. Saved on this phone either way.
            </ThemedText>
          )}
        </ThemedView>

        <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
          <ThemedText type="small" themeColor="textSecondary">
            Delete climb
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', justifyContent: 'center' },
  form: { flexGrow: 1, maxWidth: MaxContentWidth, gap: Spacing.four, padding: Spacing.four },
  context: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  pair: { flexDirection: 'row', gap: Spacing.three },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  gridItem: { flexBasis: '45%', flexGrow: 1 },
  pitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  footer: { gap: Spacing.two, marginTop: Spacing.two },
  delete: { alignItems: 'center', paddingVertical: Spacing.three },
  pressed: { opacity: 0.7 },
});
