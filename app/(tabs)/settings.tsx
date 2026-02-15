import { Alert, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { importPeriods, listPeriods } from '@/lib/periods';
import { importSymptomLogs, listSymptomLogs } from '@/lib/symptoms';
import { deleteAllData } from '@/lib/db';
import { emitDataChanged } from '@/lib/events';
import { importNotes, listNotes } from '@/lib/notes';
import { loadSettings, saveSettings } from '@/lib/storage';
import { useEffect, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { scheduleBirthControlReminder, schedulePeriodReminder } from '@/lib/reminders';
import * as Notifications from 'expo-notifications';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen() {
  const { language, setLanguage } = useLanguage();
  const [birthEnabled, setBirthEnabled] = useState(false);
  const [birthTime, setBirthTime] = useState({ hour: 9, minute: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [periodEnabled, setPeriodEnabled] = useState(false);
  const [periodLeadDays, setPeriodLeadDays] = useState(2);
  const [periodTime, setPeriodTime] = useState({ hour: 9, minute: 0 });
  const [showPeriodTimePicker, setShowPeriodTimePicker] = useState(false);
  const [debugLines, setDebugLines] = useState<string[]>([]);

  const reconcileReminderSchedules = async () => {
    const current = await loadSettings();
    const birthId = await scheduleBirthControlReminder(current);
    const withBirth = { ...current, birthControlNotificationId: birthId };
    const periodId = await schedulePeriodReminder(withBirth);
    const finalSettings = { ...withBirth, periodReminderNotificationId: periodId };
    await saveSettings(finalSettings);
    setBirthEnabled(finalSettings.birthControlEnabled);
    setPeriodEnabled(finalSettings.periodReminderEnabled);
    await refreshReminderDebug();
  };

  const refreshReminderDebug = async () => {
    const [settings, scheduled] = await Promise.all([
      loadSettings(),
      Notifications.getAllScheduledNotificationsAsync(),
    ]);

    const findById = (id: string | null) => {
      if (!id) return null;
      return scheduled.find((item) => item.identifier === id) ?? null;
    };

    const birth = findById(settings.birthControlNotificationId);
    const period = findById(settings.periodReminderNotificationId);

    setDebugLines([
      `Scheduled total: ${scheduled.length}`,
      `Birth enabled: ${settings.birthControlEnabled ? 'yes' : 'no'}`,
      `Birth id: ${settings.birthControlNotificationId ?? 'none'}`,
      `Birth scheduled: ${birth ? 'yes' : 'no'}`,
      `Birth trigger: ${birth ? JSON.stringify(birth.trigger) : 'none'}`,
      `Period enabled: ${settings.periodReminderEnabled ? 'yes' : 'no'}`,
      `Period id: ${settings.periodReminderNotificationId ?? 'none'}`,
      `Period scheduled: ${period ? 'yes' : 'no'}`,
      `Period trigger: ${period ? JSON.stringify(period.trigger) : 'none'}`,
    ]);
  };
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
      Alert.alert(t('alerts.exportSavedTitle'), t('alerts.exportSavedBody', { path: fileUri }));
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
      Alert.alert(t('alerts.exportSavedTitle'), t('alerts.exportSavedBody', { path: fileUri }));
    }
  };

  const handleDelete = async () => {
    Alert.alert(t('alerts.deleteAllTitle'), t('alerts.deleteAllBody'), [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: t('actions.delete'),
        style: 'destructive',
        onPress: async () => {
          await Notifications.cancelAllScheduledNotificationsAsync();
          const current = await loadSettings();
          await saveSettings({
            ...current,
            birthControlEnabled: false,
            periodReminderEnabled: false,
            birthControlNotificationId: null,
            periodReminderNotificationId: null,
            lastPeriodStartDate: null,
          });
          setBirthEnabled(false);
          setPeriodEnabled(false);
          await deleteAllData();
          emitDataChanged();
          await refreshReminderDebug();
          Alert.alert(t('alerts.deletedTitle'), t('alerts.deletedBody'));
        },
      },
    ]);
  };

  const handleImport = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/csv', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    const content = await FileSystem.readAsStringAsync(file.uri);

    const doImport = async () => {
      if (file.name?.endsWith('.csv')) {
        Alert.alert(t('alerts.csvNotSupportedTitle'), t('alerts.csvNotSupportedBody'));
        return;
      }
      const data = JSON.parse(content) as {
        periods?: any[];
        symptoms?: any[];
        notes?: any[];
      };
      await importPeriods(
        (data.periods ?? []).map((p) => ({
          startDate: p.startDate,
          endDate: p.endDate ?? null,
          flowIntensity: p.flowIntensity,
          createdAt: p.createdAt ?? Date.now(),
        })),
      );
      await importSymptomLogs(
        (data.symptoms ?? []).map((s) => ({
          logDate: s.logDate,
          symptoms: s.symptoms ?? [],
          moods: s.moods ?? [],
          notes: s.notes ?? null,
          createdAt: s.createdAt ?? Date.now(),
        })),
      );
      await importNotes(
        (data.notes ?? []).map((n) => ({
          logDate: n.logDate,
          text: n.text ?? '',
          createdAt: n.createdAt ?? Date.now(),
        })),
      );
      emitDataChanged();
      await reconcileReminderSchedules();
      Alert.alert(t('alerts.importCompleteTitle'), t('alerts.importCompleteBody'));
    };

    Alert.alert(t('alerts.importTitle'), t('alerts.importBody'), [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: t('actions.replace'),
        style: 'destructive',
        onPress: async () => {
          await deleteAllData();
          await doImport();
        },
      },
      {
        text: t('actions.merge'),
        onPress: async () => {
          await doImport();
        },
      },
    ]);
  };

  useEffect(() => {
    loadSettings().then((settings) => {
      setBirthEnabled(settings.birthControlEnabled);
      setBirthTime(settings.birthControlTime);
      setPeriodEnabled(settings.periodReminderEnabled);
      setPeriodLeadDays(settings.periodReminderLeadDays);
      setPeriodTime(settings.periodReminderTime);
      refreshReminderDebug();
    });
  }, []);

  const handleToggleBirth = async (value: boolean) => {
    setBirthEnabled(value);
    const current = await loadSettings();
    const next = { ...current, birthControlEnabled: value, birthControlTime: birthTime };
    const id = await scheduleBirthControlReminder(next);
    next.birthControlNotificationId = id;
    await saveSettings(next);
    await refreshReminderDebug();
  };

  const onChangeTime = async (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (!selected) return;
    const nextTime = { hour: selected.getHours(), minute: selected.getMinutes() };
    setBirthTime(nextTime);
    const current = await loadSettings();
    const next = { ...current, birthControlEnabled: birthEnabled, birthControlTime: nextTime };
    const id = await scheduleBirthControlReminder(next);
    next.birthControlNotificationId = id;
    await saveSettings(next);
    await refreshReminderDebug();
  };

  const handleTogglePeriod = async (value: boolean) => {
    setPeriodEnabled(value);
    const current = await loadSettings();
    const next = {
      ...current,
      periodReminderEnabled: value,
      periodReminderLeadDays: periodLeadDays,
      periodReminderTime: periodTime,
    };
    const id = await schedulePeriodReminder(next);
    next.periodReminderNotificationId = id;
    await saveSettings(next);
    if (value && !id) {
      Alert.alert(t('alerts.periodPendingTitle'), t('alerts.periodPendingBody'));
    }
    await refreshReminderDebug();
  };

  const handleLeadChange = async (delta: number) => {
    const nextLead = Math.max(1, Math.min(5, periodLeadDays + delta));
    setPeriodLeadDays(nextLead);
    const current = await loadSettings();
    const next = {
      ...current,
      periodReminderEnabled: periodEnabled,
      periodReminderLeadDays: nextLead,
      periodReminderTime: periodTime,
    };
    await saveSettings(next);
    if (periodEnabled) {
      const id = await schedulePeriodReminder(next);
      next.periodReminderNotificationId = id;
      await saveSettings(next);
    }
    await refreshReminderDebug();
  };

  const onChangePeriodTime = async (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowPeriodTimePicker(false);
    if (!selected) return;
    const nextTime = { hour: selected.getHours(), minute: selected.getMinutes() };
    setPeriodTime(nextTime);
    const current = await loadSettings();
    const next = {
      ...current,
      periodReminderEnabled: periodEnabled,
      periodReminderLeadDays: periodLeadDays,
      periodReminderTime: nextTime,
    };
    await saveSettings(next);
    if (periodEnabled) {
      const id = await schedulePeriodReminder(next);
      next.periodReminderNotificationId = id;
      await saveSettings(next);
    }
    await refreshReminderDebug();
  };

  return (
    <SafeAreaView
      key={`settings-${language}`}
      className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView>
        <View className="px-6 pt-8 pb-10">
        <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
          {t('settings.title')}
        </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          {t('settings.subtitle')}
        </Text>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            {t('settings.dataControls')}
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            {t('settings.dataLocal')}
          </Text>
          <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
            {t('settings.dataNote')}
          </Text>

          <Pressable
            className="mt-4 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleExport}>
            <Text className="text-sm font-semibold text-primary">{t('settings.exportJson')}</Text>
          </Pressable>
          <Pressable
            className="mt-3 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleExportCsv}>
            <Text className="text-sm font-semibold text-primary">{t('settings.exportCsv')}</Text>
          </Pressable>
          <Pressable
            className="mt-3 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleImport}>
            <Text className="text-sm font-semibold text-primary">{t('settings.importJson')}</Text>
          </Pressable>

          <Pressable
            className="mt-3 rounded-none border border-border dark:border-border-dark px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleDelete}>
            <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
              {t('settings.deleteAll')}
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            {t('settings.reminders')}
          </Text>
          <View className="mt-3">
            <Text className="text-sm text-foreground dark:text-foreground-dark">
              {t('settings.periodReminder')}
            </Text>
            <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
              {t('settings.periodReminderHint')}
            </Text>
            <View className="mt-2 self-start">
              <Switch value={periodEnabled} onValueChange={handleTogglePeriod} />
            </View>
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-xs text-muted dark:text-muted-dark">
              {t('settings.leadTime')}
            </Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                className="rounded-none border border-border dark:border-border-dark px-3 py-1 active:opacity-80"
                onPress={() => handleLeadChange(-1)}>
                <Text className="text-xs text-foreground dark:text-foreground-dark">-</Text>
              </Pressable>
              <Text className="text-xs text-foreground dark:text-foreground-dark">
                {t('settings.leadDays', { days: periodLeadDays })}
              </Text>
              <Pressable
                className="rounded-none border border-border dark:border-border-dark px-3 py-1 active:opacity-80"
                onPress={() => handleLeadChange(1)}>
                <Text className="text-xs text-foreground dark:text-foreground-dark">+</Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            className="mt-3 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={() => setShowPeriodTimePicker((prev) => !prev)}>
            <Text className="text-sm font-semibold text-primary">
              {t('settings.reminderTime', {
                time: `${String(periodTime.hour).padStart(2, '0')}:${String(periodTime.minute).padStart(2, '0')}`,
              })}
            </Text>
          </Pressable>
          {showPeriodTimePicker ? (
            <DateTimePicker
              value={new Date(0, 0, 0, periodTime.hour, periodTime.minute)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangePeriodTime}
            />
          ) : null}
          <View className="mt-4 h-px w-full bg-border dark:bg-border-dark" />
          <View className="mt-4">
            <Text className="text-sm text-foreground dark:text-foreground-dark">
              {t('settings.birthReminder')}
            </Text>
            <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
              {t('settings.birthReminderHint')}
            </Text>
            <View className="mt-2 self-start">
              <Switch value={birthEnabled} onValueChange={handleToggleBirth} />
            </View>
          </View>
          <Pressable
            className="mt-4 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={() => setShowTimePicker((prev) => !prev)}>
            <Text className="text-sm font-semibold text-primary">
              {t('settings.reminderTime', {
                time: `${String(birthTime.hour).padStart(2, '0')}:${String(birthTime.minute).padStart(2, '0')}`,
              })}
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
          <Pressable
            className="mt-4 rounded-none border border-border dark:border-border-dark px-5 py-3 active:scale-95 active:opacity-80"
            onPress={async () => {
              await Notifications.cancelAllScheduledNotificationsAsync();
              const current = await loadSettings();
              await saveSettings({
                ...current,
                birthControlEnabled: false,
                periodReminderEnabled: false,
                birthControlNotificationId: null,
                periodReminderNotificationId: null,
              });
              setBirthEnabled(false);
              setPeriodEnabled(false);
              Alert.alert(t('alerts.clearedTitle'), t('alerts.clearedBody'));
              await refreshReminderDebug();
            }}>
            <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
              {t('settings.clearAll')}
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              Reminder debug
            </Text>
            <Pressable
              className="rounded-none border border-border dark:border-border-dark px-3 py-1 active:opacity-80"
              onPress={refreshReminderDebug}>
              <Text className="text-xs text-foreground dark:text-foreground-dark">Refresh</Text>
            </Pressable>
          </View>
          <View className="mt-3 gap-1">
            {debugLines.map((line) => (
              <Text
                key={line}
                className="text-xs text-muted dark:text-muted-dark">
                {line}
              </Text>
            ))}
          </View>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            {t('settings.language')}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-3">
            {([
              { code: 'en', label: 'English', flag: '🇬🇧' },
              { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
              { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
            ] as const).map((item) => {
              const selected = language === item.code;
              return (
                <Pressable
                  key={item.code}
                  className={`rounded-none border px-4 py-3 active:scale-95 active:opacity-80 ${
                    selected
                      ? 'border-primary bg-accent dark:bg-accent-dark'
                      : 'border-border dark:border-border-dark'
                  }`}
                  onPress={() => setLanguage(item.code)}>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base">{item.flag}</Text>
                    <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            {t('settings.privacy')}
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            {t('settings.privacyText')}
          </Text>
        </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
