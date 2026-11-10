import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { flushAll } from '@/db/autosave';
import { migrateDbIfNeeded } from '@/db/migrations';
import { useSubmissionQueue } from '@/hooks/use-submission-queue';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Write any debounced edits before the OS can suspend or kill the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flushAll();
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider
        databaseName="tickmark.db"
        onInit={migrateDbIfNeeded}
        options={{ enableChangeListener: true }}>
        <SubmissionQueue />
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="climb/[id]/setup" options={{ title: 'Add a climb' }} />
            <Stack.Screen name="climb/[id]/area" options={{ title: 'Where is it?' }} />
            <Stack.Screen name="climb/[id]/index" options={{ title: 'Climb' }} />
            <Stack.Screen name="climb/[id]/pitch/[n]" options={{ title: 'Pitch' }} />
            <Stack.Screen name="climb/[id]/review" options={{ title: 'Check and send' }} />
          </Stack>
        </ThemeProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

/** Needs the database, so it lives inside `SQLiteProvider`. */
function SubmissionQueue() {
  useSubmissionQueue();
  return null;
}
