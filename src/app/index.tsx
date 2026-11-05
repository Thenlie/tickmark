import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KIND_LABELS } from '@/climb/labels';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { createDraft } from '@/db/climbs';
import { useClimbs, type ClimbListItem } from '@/hooks/use-climb';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const climbs = useClimbs();

  const addClimb = async () => {
    const id = await createDraft(db);
    router.push({ pathname: '/climb/[id]/setup', params: { id } });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <ThemedText type="subtitle">Tickmark</ThemedText>

        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={climbs ?? []}
          keyExtractor={(item) => item.climb.id}
          renderItem={({ item }) => <ClimbRow item={item} />}
          ListEmptyComponent={
            climbs ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                No climbs yet. Climbs you add are saved on this phone, even without signal.
              </ThemedText>
            ) : undefined
          }
        />

        <Pressable
          accessibilityRole="button"
          onPress={addClimb}
          style={({ pressed }) => [styles.addButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
          <ThemedText themeColor="onPrimary" style={styles.addButtonText}>
            + Add a climb
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

function ClimbRow({ item }: { item: ClimbListItem }) {
  const { climb, area, status } = item;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/climb/[id]', params: { id: climb.id } })}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedText type="default">{climb.name.trim() || 'Untitled climb'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {[KIND_LABELS[climb.kind], climb.grade, area?.name ?? 'No area yet'].filter(Boolean).join(' · ')}
        </ThemedText>
        <StatusChip status={status} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  empty: {
    paddingVertical: Spacing.five,
    textAlign: 'center',
  },
  row: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  addButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  addButtonText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.8,
  },
});
