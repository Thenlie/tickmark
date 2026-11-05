import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { flushAll } from '@/db/autosave';
import { migrateDbIfNeeded } from '@/db/migrations';

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
    <SQLiteProvider
      databaseName="tickmark.db"
      onInit={migrateDbIfNeeded}
      options={{ enableChangeListener: true }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="climb/[id]/setup" options={{ title: 'Add a climb' }} />
          <Stack.Screen name="climb/[id]/area" options={{ title: 'Where is it?' }} />
          <Stack.Screen name="climb/[id]/index" options={{ title: 'Climb' }} />
          <Stack.Screen name="climb/[id]/pitch/[n]" options={{ title: 'Pitch' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
