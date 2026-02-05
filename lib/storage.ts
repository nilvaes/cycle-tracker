import * as FileSystem from 'expo-file-system/legacy';

const SETTINGS_PATH = `${FileSystem.documentDirectory}settings.json`;

export type AppSettings = {
  birthControlEnabled: boolean;
  birthControlTime: { hour: number; minute: number };
  birthControlNotificationId: string | null;
  periodReminderEnabled: boolean;
  periodReminderLeadDays: number;
  periodReminderTime: { hour: number; minute: number };
  periodReminderNotificationId: string | null;
  cycleLengthDays: number;
  periodLengthDays: number;
  lastPeriodStartDate: string | null;
  onboarded: boolean;
  languageCode: 'en' | 'de' | 'tr';
};

export const defaultSettings: AppSettings = {
  birthControlEnabled: false,
  birthControlTime: { hour: 9, minute: 0 },
  birthControlNotificationId: null,
  periodReminderEnabled: false,
  periodReminderLeadDays: 2,
  periodReminderTime: { hour: 9, minute: 0 },
  periodReminderNotificationId: null,
  cycleLengthDays: 28,
  periodLengthDays: 5,
  lastPeriodStartDate: null,
  onboarded: false,
  languageCode: 'en',
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const content = await FileSystem.readAsStringAsync(SETTINGS_PATH);
    const data = JSON.parse(content) as AppSettings;
    return { ...defaultSettings, ...data };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings) {
  await FileSystem.writeAsStringAsync(SETTINGS_PATH, JSON.stringify(settings));
}
