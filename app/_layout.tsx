import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import { useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDb } from '@/lib/db';
import { loadSettings } from '@/lib/storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    initDb();
  }, []);

  useEffect(() => {
    loadSettings().then((settings) => {
      setOnboarded(settings.onboarded);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!onboarded) {
      router.replace('/onboarding');
    }
  }, [ready, onboarded, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
