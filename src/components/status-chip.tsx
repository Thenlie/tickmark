import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { displayStatus, statusLabel, type ClimbStatus } from '@/climb/readiness';
import type { Climb } from '@/climb/types';
import { Spacing } from '@/constants/theme';

/** "Ready to send", "Draft · 2 missing" or the sync state, plus a "No position" nudge. */
export function StatusChip({ climb, status }: { climb: Climb; status: ClimbStatus }) {
  const shown = displayStatus(climb, status);
  const highlight = shown !== 'draft';
  return (
    <ThemedView style={styles.row}>
      <ThemedView type={highlight ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
        <ThemedText
          type="smallBold"
          themeColor={shown === 'failed' ? 'danger' : highlight ? 'text' : 'textSecondary'}>
          {shown === 'draft' ? `Draft · ${status.missing.length} missing` : statusLabel(climb, status)}
        </ThemedText>
      </ThemedView>
      {status.warnings.includes('no-position') && (
        <ThemedText type="small" themeColor="textSecondary">
          No position logged
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.half,
  },
});
