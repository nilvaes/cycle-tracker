import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';

import { loadSettings, saveSettings } from '@/lib/storage';
import { scheduleBirthControlReminder, schedulePeriodReminder } from '@/lib/reminders';

export default function OnboardingScreen() {
  const [lastStartDate, setLastStartDate] = useState<Date>(new Date());
  const [cycleLength, setCycleLength] = useState('28');
  const [periodLength, setPeriodLength] = useState('5');
  const [periodReminder, setPeriodReminder] = useState(false);
  const [leadDays, setLeadDays] = useState(2);
  const [periodTime, setPeriodTime] = useState({ hour: 9, minute: 0 });
  const [birthControl, setBirthControl] = useState(false);
  const [birthTime, setBirthTime] = useState({ hour: 9, minute: 0 });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPeriodTimePicker, setShowPeriodTimePicker] = useState(false);
  const [showBirthTimePicker, setShowBirthTimePicker] = useState(false);

  useEffect(() => {
    loadSettings().then((settings) => {
      if (settings.lastPeriodStartDate) {
        const [y, m, d] = settings.lastPeriodStartDate.split('-').map(Number);
        if (y && m && d) setLastStartDate(new Date(y, m - 1, d));
      }
      setCycleLength(String(settings.cycleLengthDays));
      setPeriodLength(String(settings.periodLengthDays));
      setPeriodReminder(settings.periodReminderEnabled);
      setLeadDays(settings.periodReminderLeadDays);
      setPeriodTime(settings.periodReminderTime);
      setBirthControl(settings.birthControlEnabled);
      setBirthTime(settings.birthControlTime);
    });
  }, []);

  const formatDisplayDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatIsoDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const onChangeDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selected) setLastStartDate(selected);
  };

  const onChangePeriodTime = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowPeriodTimePicker(false);
    if (!selected) return;
    setPeriodTime({ hour: selected.getHours(), minute: selected.getMinutes() });
  };

  const onChangeBirthTime = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowBirthTimePicker(false);
    if (!selected) return;
    setBirthTime({ hour: selected.getHours(), minute: selected.getMinutes() });
  };

  const handleSave = async () => {
    const cycle = Math.max(20, Math.min(40, Number(cycleLength) || 28));
    const period = Math.max(2, Math.min(10, Number(periodLength) || 5));
    const settings = {
      ...(await loadSettings()),
      onboarded: true,
      lastPeriodStartDate: formatIsoDate(lastStartDate),
      cycleLengthDays: cycle,
      periodLengthDays: period,
      periodReminderEnabled: periodReminder,
      periodReminderLeadDays: leadDays,
      periodReminderTime: periodTime,
      birthControlEnabled: birthControl,
      birthControlTime: birthTime,
    };
    const periodId = await schedulePeriodReminder(settings);
    const birthId = await scheduleBirthControlReminder(settings);
    settings.periodReminderNotificationId = periodId;
    settings.birthControlNotificationId = birthId;
    await saveSettings(settings);
    Alert.alert('All set', 'You can adjust these anytime in Settings.');
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView>
        <View className="px-6 pt-8 pb-10">
        <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
          Welcome
        </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          Your data stays on your device. Let’s set up your cycle.
        </Text>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-sm text-muted dark:text-muted-dark">Last period start</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Text className="mt-2 text-lg text-foreground dark:text-foreground-dark">
              {formatDisplayDate(lastStartDate)}
            </Text>
          </Pressable>
          {showDatePicker ? (
            <DateTimePicker
              value={lastStartDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDate}
            />
          ) : null}
        </View>

        <View className="mt-4 flex-row gap-4">
          <View className="flex-1 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
            <Text className="text-xs text-muted dark:text-muted-dark">Cycle length</Text>
            <TextInput
              value={cycleLength}
              onChangeText={setCycleLength}
              keyboardType="number-pad"
              className="mt-2 text-lg text-foreground dark:text-foreground-dark"
            />
          </View>
          <View className="flex-1 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
            <Text className="text-xs text-muted dark:text-muted-dark">Period length</Text>
            <TextInput
              value={periodLength}
              onChangeText={setPeriodLength}
              keyboardType="number-pad"
              className="mt-2 text-lg text-foreground dark:text-foreground-dark"
            />
          </View>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Period reminder
          </Text>
          <Text className="mt-2 text-xs text-muted dark:text-muted-dark">
            Get a reminder before your period starts.
          </Text>
          <Pressable
            className="mt-3 rounded-none border border-border dark:border-border-dark px-4 py-2"
            onPress={() => setPeriodReminder((prev) => !prev)}>
            <Text className="text-xs text-foreground dark:text-foreground-dark">
              {periodReminder ? 'Enabled' : 'Disabled'}
            </Text>
          </Pressable>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-xs text-muted dark:text-muted-dark">Lead time</Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                className="rounded-none border border-border dark:border-border-dark px-3 py-1"
                onPress={() => setLeadDays(Math.max(1, leadDays - 1))}>
                <Text className="text-xs text-foreground dark:text-foreground-dark">-</Text>
              </Pressable>
              <Text className="text-xs text-foreground dark:text-foreground-dark">
                {leadDays} days
              </Text>
              <Pressable
                className="rounded-none border border-border dark:border-border-dark px-3 py-1"
                onPress={() => setLeadDays(Math.min(5, leadDays + 1))}>
                <Text className="text-xs text-foreground dark:text-foreground-dark">+</Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            className="mt-3 rounded-none border border-primary px-5 py-3"
            onPress={() => setShowPeriodTimePicker((prev) => !prev)}>
            <Text className="text-sm font-semibold text-primary">
              Reminder time: {String(periodTime.hour).padStart(2, '0')}:
              {String(periodTime.minute).padStart(2, '0')}
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
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Birth control reminder
          </Text>
          <Text className="mt-2 text-xs text-muted dark:text-muted-dark">
            Turn on to receive a daily reminder.
          </Text>
          <Pressable
            className="mt-3 rounded-none border border-border dark:border-border-dark px-4 py-2"
            onPress={() => setBirthControl((prev) => !prev)}>
            <Text className="text-xs text-foreground dark:text-foreground-dark">
              {birthControl ? 'Enabled' : 'Disabled'}
            </Text>
          </Pressable>
          <Pressable
            className="mt-3 rounded-none border border-primary px-5 py-3"
            onPress={() => setShowBirthTimePicker((prev) => !prev)}>
            <Text className="text-sm font-semibold text-primary">
              Reminder time: {String(birthTime.hour).padStart(2, '0')}:
              {String(birthTime.minute).padStart(2, '0')}
            </Text>
          </Pressable>
          {showBirthTimePicker ? (
            <DateTimePicker
              value={new Date(0, 0, 0, birthTime.hour, birthTime.minute)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeBirthTime}
            />
          ) : null}
        </View>

        <Pressable
          className="mt-6 rounded-none border border-primary px-5 py-3"
          onPress={handleSave}>
          <Text className="text-sm font-semibold text-primary">Finish setup</Text>
        </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
