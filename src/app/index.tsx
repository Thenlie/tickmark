import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KIND_LABELS } from '@/climb/labels';
import { confirmDeleteClimb } from '@/components/confirm-delete-climb';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { createDraft, deleteUntouchedDrafts } from '@/db/climbs';
import { useClimbs, type ClimbListItem } from '@/hooks/use-climb';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const climbs = useClimbs();

  const addClimb = async () => {
    await deleteUntouchedDrafts(db);
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
          ListHeaderComponent={
            climbs?.length ? (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                NOT YET ON OPENBETA
              </ThemedText>
            ) : undefined
          }
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
  const theme = useTheme();
  const db = useSQLiteContext();
  const swipeable = useRef<SwipeableMethods>(null);

  // Slide back closed on cancel; on delete the row leaves the list.
  const confirmDelete = () => confirmDeleteClimb(db, climb.id, { onCancel: () => swipeable.current?.close() });

  return (
    <Swipeable
      ref={swipeable}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete climb"
          onPress={confirmDelete}
          style={({ pressed }) => [styles.deleteAction, { backgroundColor: theme.danger }, pressed && styles.pressed]}>
          <SymbolView name={{ ios: 'trash', android: 'delete' }} size={24} tintColor={theme.onPrimary} />
        </Pressable>
      )}>
      <Pressable
        accessibilityRole="button"
        // Swiping isn't reachable with a screen reader, so offer delete as an action too.
        accessibilityActions={[{ name: 'delete', label: 'Delete climb' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && confirmDelete()}
        onPress={() => router.push({ pathname: '/climb/[id]', params: { id: climb.id } })}>
        {/* Darken instead of fading: an opacity change would show the Delete button behind the card. */}
        {({ pressed }) => (
          <ThemedView type={pressed ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
            <ThemedText type="default">{climb.name.trim() || 'Untitled climb'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[KIND_LABELS[climb.kind], climb.grade, area?.name ?? 'No area yet'].filter(Boolean).join(' · ')}
            </ThemedText>
            <StatusChip status={status} />
          </ThemedView>
        )}
      </Pressable>
    </Swipeable>
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
  sectionTitle: {
    letterSpacing: 0.6,
  },
  empty: {
    paddingVertical: Spacing.five,
    textAlign: 'center',
  },
  swipeContainer: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  row: {
    gap: Spacing.one,
    padding: Spacing.three,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
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
