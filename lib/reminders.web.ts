/**
 * Web-only stub: no push notifications on web.
 */
import type { AppSettings } from './storage';

export async function scheduleBirthControlReminder(
  _settings: AppSettings,
): Promise<string | null> {
  return null;
}

export async function schedulePeriodReminder(_settings: AppSettings): Promise<string | null> {
  return null;
}
