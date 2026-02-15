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
import { loadSettings, saveSettings } from '@/lib/storage';
import { scheduleBirthControlReminder, schedulePeriodReminder } from '@/lib/reminders';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const bootstrap = async () => {
      await initDb();
      const current = await loadSettings();
      const birthId = await scheduleBirthControlReminder(current);
      const next = { ...current, birthControlNotificationId: birthId };
      const periodId = await schedulePeriodReminder(next);
      const finalSettings = { ...next, periodReminderNotificationId: periodId };
      if (
        finalSettings.birthControlNotificationId !== current.birthControlNotificationId ||
        finalSettings.periodReminderNotificationId !== current.periodReminderNotificationId
      ) {
        await saveSettings(finalSettings);
      }
    };
    bootstrap().catch((error) => {
      console.warn('Reminder bootstrap failed', error);
    });
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
