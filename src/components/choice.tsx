import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Single choice from a few options, e.g. Boulder / Rope / Ice. */
export function Segmented<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o)}
            style={[styles.segment, on && { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" themeColor={on ? 'onPrimary' : 'text'}>
              {labels[o]}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

/** Multiple choice as toggle chips, e.g. disciplines. */
export function Chips<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: readonly T[];
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T[]) => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.chips}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <Pressable
            key={o}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: on ? theme.primary : theme.backgroundSelected },
              on && { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={on && { color: theme.primary }}>
              {labels[o]}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

/** − n + control. */
export function Stepper({
  value,
  min = 1,
  max = 99,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fewer"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={({ pressed }) => [styles.stepButton, (pressed || value <= min) && styles.pressed]}>
        <ThemedText type="smallBold">−</ThemedText>
      </Pressable>
      <ThemedText style={styles.stepValue}>{value}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [styles.stepButton, (pressed || value >= max) && styles.pressed]}>
        <ThemedText type="smallBold">+</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two + Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    minHeight: 48,
  },
  stepButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  stepValue: {
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.5,
  },
});
