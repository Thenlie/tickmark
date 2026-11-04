import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AddClimbScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [comments, setComments] = useState('');
  const [pictureUri, setPictureUri] = useState<string | null>(null);

  const pickPicture = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled) {
      setPictureUri(result.assets[0].uri);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView
        style={[styles.flex, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + Spacing.four },
        ]}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.form}>
          <FormField label="Name">
            <FormInput value={name} onChangeText={setName} placeholder="e.g. The Nose" />
          </FormField>

          <FormField label="Grade">
            <FormInput
              value={grade}
              onChangeText={setGrade}
              placeholder="e.g. V4 or 5.10a"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>

          <FormField label="Comments">
            <FormInput
              value={comments}
              onChangeText={setComments}
              placeholder="Beta, approach, protection, etc."
              multiline
              style={styles.multiline}
            />
          </FormField>

          <FormField label="Picture">
            {pictureUri ? (
              <ThemedView style={styles.pictureContainer}>
                <Image source={{ uri: pictureUri }} style={styles.picture} contentFit="cover" />
                <ThemedView style={styles.pictureActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={pickPicture}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedText type="smallBold">Change</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPictureUri(null)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Remove
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              </ThemedView>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={pickPicture}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView
                  type="backgroundElement"
                  style={[styles.picturePlaceholder, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText themeColor="textSecondary">+ Add a picture</ThemedText>
                </ThemedView>
              </Pressable>
            )}
          </FormField>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ThemedView style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </ThemedView>
  );
}

function FormInput({ style, ...props }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        { backgroundColor: theme.backgroundElement, color: theme.text },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  form: {
    flexGrow: 1,
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
    padding: Spacing.four,
  },
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
  picturePlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  pictureContainer: {
    gap: Spacing.two,
  },
  picture: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
  pictureActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
