import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Photo } from '@/climb/types';
import { Spacing } from '@/constants/theme';
import { addPhoto, photoUri, removePhoto } from '@/db/photos';
import { useTheme } from '@/hooks/use-theme';

/** Thumbnails plus camera and library buttons. Photos are copied into app storage on pick. */
export function PhotoStrip({ climbId, photos }: { climbId: string; photos: Photo[] }) {
  const db = useSQLiteContext();
  const theme = useTheme();

  const save = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    for (const asset of result.assets) await addPhoto(db, climbId, asset.uri);
  };

  const fromLibrary = async () =>
    save(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: true }));

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    await save(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }));
  };

  return (
    <ThemedView style={styles.wrap}>
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {photos.map((p) => (
            <ThemedView key={p.id} style={styles.thumbWrap}>
              <Image source={{ uri: photoUri(p) }} style={styles.thumb} contentFit="cover" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                onPress={() => removePhoto(db, p)}
                hitSlop={8}
                style={[styles.remove, { backgroundColor: theme.background }]}>
                <ThemedText type="smallBold">×</ThemedText>
              </Pressable>
            </ThemedView>
          ))}
        </ScrollView>
      )}
      <ThemedView style={styles.buttons}>
        <AddButton label="Take photo" onPress={fromCamera} />
        <AddButton label="Choose photos" onPress={fromLibrary} />
      </ThemedView>
    </ThemedView>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.flex, pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={[styles.add, { borderColor: theme.backgroundSelected }]}>
        <ThemedText type="small" themeColor="textSecondary">
          + {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: { gap: Spacing.two },
  thumbWrap: { position: 'relative' },
  thumb: { width: 96, height: 96, borderRadius: Spacing.two },
  remove: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  add: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  pressed: { opacity: 0.7 },
});
