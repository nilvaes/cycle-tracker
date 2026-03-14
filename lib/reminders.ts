import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { listPeriods } from './periods';
import { AppSettings } from './storage';

function toIsoDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function daysBetween(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

async function ensureNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied') return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function scheduleBirthControlReminder(
  settings: AppSettings,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (settings.birthControlNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(
      settings.birthControlNotificationId,
    );
  }
  if (!settings.birthControlEnabled) {
    return null;
  }

  const allowed = await ensureNotificationPermission();
  if (!allowed) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Birth control reminder',
      body: 'Time to take your pill.',
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
    trigger:
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: settings.birthControlTime.hour,
            minute: settings.birthControlTime.minute,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            repeats: true,
            hour: settings.birthControlTime.hour,
            minute: settings.birthControlTime.minute,
          },
  });
  return id;
}

export async function schedulePeriodReminder(settings: AppSettings): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (settings.periodReminderNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(
      settings.periodReminderNotificationId,
    );
  }
  if (!settings.periodReminderEnabled) {
    return null;
  }

  const allowed = await ensureNotificationPermission();
  if (!allowed) return null;

  const periods = await listPeriods();
  const avgCycleDays =
    periods.length >= 2
      ? (() => {
          const sorted = [...periods].sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
          const diffs: number[] = [];
          for (let i = 1; i < sorted.length; i += 1) {
            diffs.push(daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
          }
          const total = diffs.reduce((sum, v) => sum + v, 0);
          return Math.round(total / Math.max(1, diffs.length));
        })()
      : settings.cycleLengthDays;

  const lastStart =
    periods.length > 0 ? periods[0].startDate : settings.lastPeriodStartDate;
  if (!lastStart) return null;

  let predicted = new Date(lastStart);
  predicted.setDate(predicted.getDate() + avgCycleDays);
  const todayIso = toIsoDate(new Date());
  while (toIsoDate(predicted) <= todayIso) {
    predicted.setDate(predicted.getDate() + avgCycleDays);
  }

  const reminderDate = new Date(predicted);
  reminderDate.setDate(reminderDate.getDate() - settings.periodReminderLeadDays);
  const reminderIso = toIsoDate(reminderDate);
  if (reminderIso <= todayIso) {
    reminderDate.setDate(reminderDate.getDate() + avgCycleDays);
  }

  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === 'android'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(
            reminderDate.getFullYear(),
            reminderDate.getMonth(),
            reminderDate.getDate(),
            settings.periodReminderTime.hour,
            settings.periodReminderTime.minute,
          ),
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          year: reminderDate.getFullYear(),
          month: reminderDate.getMonth() + 1,
          day: reminderDate.getDate(),
          hour: settings.periodReminderTime.hour,
          minute: settings.periodReminderTime.minute,
          repeats: false,
        };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Period reminder',
      body: `Your period is expected in ${settings.periodReminderLeadDays} day(s).`,
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
    trigger,
  });
  return id;
}
