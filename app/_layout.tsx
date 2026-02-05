import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDb } from '@/lib/db';
import { LanguageProvider } from '@/lib/language';
import { t } from '@/lib/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initDb();
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="log" options={{ headerShown: false }} />
          <Stack.Screen name="note" options={{ headerShown: false }} />
          <Stack.Screen name="symptoms" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: t('modal.title') }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </LanguageProvider>
  );
}
