/**
 * Web-only settings storage using localStorage for GitHub Pages / web preview.
 */

const SETTINGS_KEY = 'cycle-tracker-web-settings';

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
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEY) : null;
    if (raw) {
      const data = JSON.parse(raw) as AppSettings;
      return { ...defaultSettings, ...data };
    }
  } catch {
    // ignore
  }
  return defaultSettings;
}

export async function saveSettings(settings: AppSettings) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {
    // ignore
  }
}
