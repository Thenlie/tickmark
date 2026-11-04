import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            Tickmark
          </ThemedText>
        </ThemedView>

        <Pressable
          accessibilityRole="button"
          // TODO: navigate to the add climb flow once it exists.
          onPress={() => {}}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}>
          <ThemedText themeColor="onPrimary" style={styles.addButtonText}>
            + Add a Climb
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  title: {
    textAlign: 'center',
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
