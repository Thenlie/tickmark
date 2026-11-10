import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { KIND_LABELS } from '@/climb/labels';
import type { ClimbStatus } from '@/climb/readiness';
import type { Area, Climb } from '@/climb/types';
import { confirmDeleteClimb } from '@/components/confirm-delete-climb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ClimbListItem } from '@/hooks/use-climb';
import { useTheme } from '@/hooks/use-theme';

/** A climb on the home list. Tap to open it, swipe left to delete it. */
export function ClimbCard({ item }: { item: ClimbListItem }) {
  const { climb, area, status } = item;
  const db = useSQLiteContext();
  const swipeable = useRef<SwipeableMethods>(null);

  const open = () => router.push({ pathname: '/climb/[id]', params: { id: climb.id } });
  // Slide back closed on cancel; on delete the card leaves the list.
  const confirmDelete = () => confirmDeleteClimb(db, climb.id, { onCancel: () => swipeable.current?.close() });

  return (
    <Swipeable
      ref={swipeable}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.swipeContainer}
      renderRightActions={() => <DeleteAction onPress={confirmDelete} />}>
      <Pressable
        accessibilityRole="button"
        // The status is only an icon, so spell the whole card out for screen readers.
        accessibilityLabel={[climbTitle(climb), climbDetails(climb), areaPath(area), statusLabel(status)].join(', ')}
        // Swiping isn't reachable with a screen reader, so offer delete as an action too.
        accessibilityActions={[{ name: 'delete', label: 'Delete climb' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && confirmDelete()}
        onPress={open}>
        {/* Darken instead of fading: an opacity change would show the Delete button behind the card. */}
        {({ pressed }) => (
          <ThemedView type={pressed ? 'backgroundSelected' : 'backgroundElement'} style={styles.card}>
            <View style={styles.header}>
              <ThemedText type="default" style={styles.title}>
                {climbTitle(climb)}
              </ThemedText>
              <StatusIcon status={status} />
            </View>
            <InfoLine>{climbDetails(climb)}</InfoLine>
            <InfoLine icon={<PinIcon />}>{areaPath(area)}</InfoLine>
          </ThemedView>
        )}
      </Pressable>
    </Swipeable>
  );
}

function climbTitle(climb: Climb): string {
  return climb.name.trim() || 'Untitled climb';
}

/** "USA • Utah • Joe's Valley • Left Fork • Mine Cart Area" */
function areaPath(area: Area | null): string {
  return area ? area.pathTokens.join(' • ') : 'No area yet';
}

/** "Boulder · V4" */
function climbDetails(climb: Climb): string {
  return [KIND_LABELS[climb.kind], climb.grade].filter(Boolean).join(' · ');
}

/** "Ready to send" or "Draft, 2 missing" */
function statusLabel(status: ClimbStatus): string {
  return status.status === 'ready' ? 'Ready to send' : `Draft, ${status.missing.length} missing`;
}

function InfoLine({ icon, children }: { icon?: ReactNode; children: string }) {
  return (
    <View style={styles.infoLine}>
      {icon}
      <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
        {children}
      </ThemedText>
    </View>
  );
}

function PinIcon() {
  const theme = useTheme();
  return (
    <SymbolView
      name={{ ios: 'mappin', android: 'location_on' }}
      size={14}
      tintColor={theme.textSecondary}
      style={styles.pinIcon}
    />
  );
}

function StatusIcon({ status }: { status: ClimbStatus }) {
  const theme = useTheme();
  const ready = status.status === 'ready';
  return (
    <SymbolView
      name={ready ? { ios: 'checkmark.circle.fill', android: 'check_circle' } : { ios: 'pencil.circle', android: 'edit' }}
      size={22}
      tintColor={ready ? theme.primary : theme.textSecondary}
      style={styles.statusIcon}
    />
  );
}

function DeleteAction({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Delete climb"
      onPress={onPress}
      style={({ pressed }) => [styles.deleteAction, { backgroundColor: theme.danger }, pressed && styles.pressed]}>
      <SymbolView name={{ ios: 'trash', android: 'delete' }} size={24} tintColor={theme.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  statusIcon: {
    width: 22,
    height: 22,
    // Centers the icon on the first line of the title (lineHeight 24).
    marginTop: 1,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  infoText: {
    flexShrink: 1,
  },
  pinIcon: {
    width: 14,
    height: 14,
    // Centers the icon on the first line of text (lineHeight 20).
    marginTop: 3,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.8,
  },
});
