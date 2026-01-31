import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { listPeriods } from '@/lib/periods';
import { listSymptomLogs } from '@/lib/symptoms';
import { deleteAllData } from '@/lib/db';
import { emitDataChanged } from '@/lib/events';
import { listNotes } from '@/lib/notes';
import { loadSettings, saveSettings } from '@/lib/storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function SettingsScreen() {
  const [birthEnabled, setBirthEnabled] = useState(false);
  const [birthTime, setBirthTime] = useState({ hour: 9, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const handleExport = async () => {
    const [periods, symptoms, notes] = await Promise.all([
      listPeriods(),
      listSymptomLogs(),
      listNotes(),
    ]);
    const payload = {
      exportedAt: new Date().toISOString(),
      periods,
      symptoms,
      notes,
    };
    const fileUri = `${FileSystem.documentDirectory}cycle-tracker-export.json`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert('Export saved', `File saved to: ${fileUri}`);
    }
  };

  const toCsv = (rows: string[][]) => {
    const escape = (value: string) =>
      `"${value.replace(/"/g, '""')}"`;
    return rows.map((row) => row.map((cell) => escape(cell)).join(',')).join('\n');
  };

  const handleExportCsv = async () => {
    const [periods, symptoms, notes] = await Promise.all([
      listPeriods(),
      listSymptomLogs(),
      listNotes(),
    ]);
    const rows: string[][] = [
      [
        'type',
        'date',
        'end_date',
        'flow',
        'symptoms',
        'moods',
        'note',
        'created_at',
      ],
    ];
    periods.forEach((p) => {
      rows.push([
        'period',
        p.startDate,
        p.endDate ?? '',
        p.flowIntensity,
        '',
        '',
        '',
        new Date(p.createdAt).toISOString(),
      ]);
    });
    symptoms.forEach((s) => {
      rows.push([
        'symptom',
        s.logDate,
        '',
        '',
        s.symptoms.join('; '),
        s.moods.join('; '),
        '',
        new Date(s.createdAt).toISOString(),
      ]);
    });
    notes.forEach((n) => {
      rows.push([
        'note',
        n.logDate,
        '',
        '',
        '',
        '',
        n.text,
        new Date(n.createdAt).toISOString(),
      ]);
    });
    const csv = toCsv(rows);
    const fileUri = `${FileSystem.documentDirectory}cycle-tracker-export.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      Alert.alert('Export saved', `File saved to: ${fileUri}`);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete all data?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAllData();
          emitDataChanged();
          Alert.alert('Deleted', 'All local data has been removed.');
        },
      },
    ]);
  };

  useEffect(() => {
    loadSettings().then((settings) => {
      setBirthEnabled(settings.birthControlEnabled);
      setBirthTime(settings.birthControlTime);
    });
  }, []);

  const scheduleBirthControl = async (enabled: boolean, time: { hour: number; minute: number }) => {
    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Notifications disabled', 'Please enable notifications in Settings.');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Birth control reminder',
        body: 'Time to take your pill.',
        ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
      },
      trigger:
        Platform.OS === 'android'
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: time.hour,
              minute: time.minute,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              repeats: true,
              hour: time.hour,
              minute: time.minute,
            },
    });
  };

  const handleToggleBirth = async (value: boolean) => {
    setBirthEnabled(value);
    const next = { birthControlEnabled: value, birthControlTime: birthTime };
    await saveSettings(next);
    await scheduleBirthControl(value, birthTime);
  };

  const onChangeTime = async (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (!selected) return;
    const nextTime = { hour: selected.getHours(), minute: selected.getMinutes() };
    setBirthTime(nextTime);
    const next = { birthControlEnabled: birthEnabled, birthControlTime: nextTime };
    await saveSettings(next);
    if (birthEnabled) {
      await scheduleBirthControl(true, nextTime);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background dark:bg-background-dark">
      <View className="px-6 pt-12 pb-10">
        <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
          Settings
        </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          Manage your data and privacy controls.
        </Text>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Data controls
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            Your data is stored locally only.
          </Text>

          <Pressable
            className="mt-4 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleExport}>
            <Text className="text-sm font-semibold text-primary">Export data</Text>
          </Pressable>
          <Pressable
            className="mt-3 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleExportCsv}>
            <Text className="text-sm font-semibold text-primary">Export CSV</Text>
          </Pressable>

          <Pressable
            className="mt-3 rounded-none border border-border dark:border-border-dark px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleDelete}>
            <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
              Delete all data
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Reminders
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="pr-4">
              <Text className="text-sm text-foreground dark:text-foreground-dark">
                Birth control reminder
              </Text>
              <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                Turn on to receive a daily reminder.
              </Text>
            </View>
            <Switch value={birthEnabled} onValueChange={handleToggleBirth} />
          </View>
          <Pressable
            className="mt-4 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={() => setShowTimePicker((prev) => !prev)}>
            <Text className="text-sm font-semibold text-primary">
              Reminder time: {String(birthTime.hour).padStart(2, '0')}:
              {String(birthTime.minute).padStart(2, '0')}
            </Text>
          </Pressable>
          {showTimePicker ? (
            <DateTimePicker
              value={new Date(0, 0, 0, birthTime.hour, birthTime.minute)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeTime}
            />
          ) : null}
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Privacy
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            No accounts, no tracking, no analytics.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
