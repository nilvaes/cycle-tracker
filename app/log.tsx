import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { createPeriod, FlowIntensity, getPeriodById, updatePeriod } from '@/lib/periods';
import { emitDataChanged } from '@/lib/events';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { loadSettings, saveSettings } from '@/lib/storage';
import { schedulePeriodReminder } from '@/lib/reminders';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';

export default function LogPeriodScreen() {
  const { language } = useLanguage();
  const { editId, date } = useLocalSearchParams<{ editId?: string; date?: string }>();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [flow, setFlow] = useState<FlowIntensity>('medium');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loadedEdit, setLoadedEdit] = useState(false);

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return t('log.selectDate');
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

  const onChangeStart = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowStartPicker(false);
    if (selected) setStartDate(selected);
  };

  const onChangeEnd = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setShowEndPicker(false);
    if (selected) setEndDate(selected);
  };

  const parseIso = (iso: string | null) => {
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    if (editId && !loadedEdit) {
      getPeriodById(Number(editId)).then((period) => {
        if (period) {
          const start = parseIso(period.startDate);
          const end = parseIso(period.endDate);
          if (start) setStartDate(start);
          setEndDate(end);
          setFlow(period.flowIntensity);
        }
        setLoadedEdit(true);
      });
      return;
    }
    if (!editId && date) {
      const start = parseIso(date);
      if (start) setStartDate(start);
    }
  }, [editId, loadedEdit, date]);

  const handleSave = async () => {
    setError(null);

    if (endDate && endDate < startDate) {
      setError(t('alerts.endDateError'));
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await updatePeriod({
          id: Number(editId),
          startDate: formatIsoDate(startDate),
          endDate: endDate ? formatIsoDate(endDate) : null,
          flowIntensity: flow,
        });
      } else {
        await createPeriod({
          startDate: formatIsoDate(startDate),
          endDate: endDate ? formatIsoDate(endDate) : null,
          flowIntensity: flow,
        });
      }
      const current = await loadSettings();
      const next = {
        ...current,
        lastPeriodStartDate: formatIsoDate(startDate),
      };
      const reminderId = await schedulePeriodReminder(next);
      next.periodReminderNotificationId = reminderId;
      await saveSettings(next);
      emitDataChanged();
      Alert.alert(
        t('alerts.savedTitle'),
        editId ? t('alerts.periodUpdated') : t('alerts.periodLogged'),
      );
      router.back();
    } catch {
      setError(t('alerts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      key={`log-${language}`}
      className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView>
        <View className="px-6 pt-8">
          <Pressable
            className="mb-4 h-10 w-10 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
            onPress={() => router.back()}>
            <IconSymbol size={20} name="chevron.left" color="#6B6561" />
          </Pressable>
          <Text className="text-2xl font-semibold text-foreground dark:text-foreground-dark">
            {editId ? t('log.editPeriod') : t('log.addPeriod')}
          </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          {t('log.periodHint')}
        </Text>

        <View className="mt-6 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">{t('log.startDate')}</Text>
          <Pressable onPress={() => setShowStartPicker((prev) => !prev)}>
            <Text className="mt-2 text-lg text-foreground dark:text-foreground-dark">
              {formatDisplayDate(startDate)}
            </Text>
          </Pressable>
        </View>
        {showStartPicker ? (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeStart}
          />
        ) : null}

        <View className="mt-4 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">{t('log.endDate')}</Text>
          <Pressable onPress={() => setShowEndPicker((prev) => !prev)}>
            <Text className="mt-2 text-lg text-foreground dark:text-foreground-dark">
              {formatDisplayDate(endDate)}
            </Text>
          </Pressable>
        </View>
        {showEndPicker ? (
          <DateTimePicker
            value={endDate ?? startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeEnd}
          />
        ) : null}

        <View className="mt-4 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">{t('log.flow')}</Text>
          <View className="mt-3 flex-row gap-2">
            {(['light', 'medium', 'heavy'] as FlowIntensity[]).map((level) => {
              const selected = flow === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => setFlow(level)}
                  className={
                    selected
                      ? 'rounded-full bg-primary px-4 py-2'
                      : 'rounded-full border border-border dark:border-border-dark px-4 py-2'
                  }>
                  <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                    {t(`log.${level}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <Text className="mt-4 text-sm text-red-500">{error}</Text>
        ) : null}

        <View className="mt-6 flex-row gap-3">
          <Pressable
            className="rounded-none border border-border dark:border-border-dark px-5 py-3 active:scale-95 active:opacity-80"
            onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
              {t('log.cancel')}
            </Text>
          </Pressable>
          <Pressable
            className="rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleSave}
            disabled={saving}>
            <Text className="text-sm font-semibold text-primary">
              {saving ? t('log.saving') : t('log.save')}
            </Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
