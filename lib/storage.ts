import * as FileSystem from 'expo-file-system/legacy';

const SETTINGS_PATH = `${FileSystem.documentDirectory}settings.json`;

export type AppSettings = {
  birthControlEnabled: boolean;
  birthControlTime: { hour: number; minute: number };
};

export const defaultSettings: AppSettings = {
  birthControlEnabled: false,
  birthControlTime: { hour: 9, minute: 0 },
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
