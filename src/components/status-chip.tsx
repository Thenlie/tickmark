import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { ClimbStatus } from '@/climb/readiness';
import { Spacing } from '@/constants/theme';

/** "Ready to send" or "Draft · 2 missing", plus a "No position" nudge. */
export function StatusChip({ status }: { status: ClimbStatus }) {
  const ready = status.status === 'ready';
  return (
    <ThemedView style={styles.row}>
      <ThemedView type={ready ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
        <ThemedText type="smallBold" themeColor={ready ? 'text' : 'textSecondary'}>
          {ready ? 'Ready to send' : `Draft · ${status.missing.length} missing`}
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
