import { Host, Picker } from '@expo/ui';
import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
      {hint}
    </ThemedView>
  );
}

export function FormInput({ style, ...props }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }, style]}
      {...props}
    />
  );
}

/**
 * Text input that owns its value while the user types and reports every change.
 * The parent persists changes (debounced); the initial value is read once, so a
 * database reload never moves the cursor or drops keystrokes.
 */
export function DraftInput({
  initialValue,
  onChange,
  multiline,
  ...props
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'defaultValue' | 'onChange'> & {
  initialValue: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <FormInput
      value={value}
      onChangeText={(v) => {
        setValue(v);
        onChange(v);
      }}
      multiline={multiline}
      style={multiline ? styles.multiline : undefined}
      {...props}
    />
  );
}

/** Whole-number input. Empty means unknown (null). */
export function NumberInput({
  initialValue,
  onChange,
  ...props
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'defaultValue' | 'onChange'> & {
  initialValue: number | null;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(initialValue === null ? '' : String(initialValue));
  return (
    <FormInput
      value={text}
      keyboardType="number-pad"
      onChangeText={(v) => {
        const digits = v.replace(/[^0-9]/g, '');
        setText(digits);
        onChange(digits === '' ? null : Number(digits));
      }}
      {...props}
    />
  );
}

const NONE = '__none__';

/** Native dropdown (SwiftUI / Compose menu picker) for fixed lists such as grades. */
export function SelectInput<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Choose',
  labels,
  allowClear = true,
}: {
  value: T | null;
  options: readonly T[];
  onChange: (value: T | null) => void;
  placeholder?: string;
  labels?: Partial<Record<T, string>>;
  allowClear?: boolean;
}) {
  const theme = useTheme();
  const selected = value !== null && options.includes(value) ? value : NONE;
  return (
    <ThemedView type="backgroundElement" style={styles.select}>
      <Host matchContents>
        <Picker<string>
          selectedValue={selected}
          onValueChange={(v) => onChange(v === NONE ? null : (v as T))}>
          {(allowClear || selected === NONE) && <Picker.Item label={placeholder} value={NONE} />}
          {options.map((o) => (
            <Picker.Item key={o} label={labels?.[o] ?? o} value={o} />
          ))}
        </Picker>
      </Host>
      {selected === NONE && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          not set
        </ThemedText>
      )}
    </ThemedView>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
    minHeight: 48,
  },
  section: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.two,
  },
});
