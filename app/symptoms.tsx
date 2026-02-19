import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { createSymptomLog, getSymptomLogById, updateSymptomLog } from '@/lib/symptoms';
import { emitDataChanged } from '@/lib/events';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';
import { localizeMoodKey, localizeSymptomKey, MOOD_OPTION_KEYS, SYMPTOM_OPTION_KEYS } from '@/lib/options';

export default function SymptomsScreen() {
  const { language } = useLanguage();
  const { editId, date } = useLocalSearchParams<{ editId?: string; date?: string }>();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [logDate, setLogDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadedEdit, setLoadedEdit] = useState(false);

  const symptomOptions = [...SYMPTOM_OPTION_KEYS];
  const moodOptions = [...MOOD_OPTION_KEYS];

  const toggleItem = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

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
    if (selected) setLogDate(selected);
  };

  const parseIso = (iso: string) => {
    const [year, month, day] = iso.split('-').map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    if (editId && !loadedEdit) {
      getSymptomLogById(Number(editId)).then((log) => {
        if (log) {
          const parsed = parseIso(log.logDate);
          if (parsed) setLogDate(parsed);
          setSelectedSymptoms(log.symptoms);
          setSelectedMoods(log.moods);
        }
        setLoadedEdit(true);
      });
      return;
    }
    if (!editId && date) {
      const parsed = parseIso(date);
      if (parsed) setLogDate(parsed);
    }
  }, [editId, loadedEdit, date]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await updateSymptomLog({
          id: Number(editId),
          logDate: formatIsoDate(logDate),
          symptoms: selectedSymptoms,
          moods: selectedMoods,
          notes: null,
        });
      } else {
        await createSymptomLog({
          logDate: formatIsoDate(logDate),
          symptoms: selectedSymptoms,
          moods: selectedMoods,
          notes: null,
        });
      }
      emitDataChanged();
      Alert.alert(
        t('alerts.savedTitle'),
        editId ? t('alerts.symptomsUpdated') : t('alerts.symptomsLogged'),
      );
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      key={`symptoms-${language}`}
      className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView>
        <View className="px-6 pt-8">
          <Pressable
            className="mb-4 h-10 w-10 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
            onPress={() => router.back()}>
            <IconSymbol size={20} name="chevron.left" color="#6B6561" />
          </Pressable>
          <Text className="text-2xl font-semibold text-foreground dark:text-foreground-dark">
            {editId ? t('log.editSymptoms') : t('log.addSymptoms')}
          </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          {t('log.symptomsHint')}
        </Text>

        <View className="mt-4 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">{t('log.logDate')}</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Text className="mt-2 text-lg text-foreground dark:text-foreground-dark">
              {formatDisplayDate(logDate)}
            </Text>
          </Pressable>
        </View>
        {showDatePicker ? (
          <DateTimePicker
            value={logDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
          />
        ) : null}

        <View className="mt-6 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">{t('log.symptoms')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {symptomOptions.map((label) => {
              const selected = selectedSymptoms.includes(label);
              return (
                <Pressable
                  key={label}
                  onPress={() => setSelectedSymptoms((current) => toggleItem(current, label))}
                  className={
                    selected
                      ? 'rounded-full bg-primary px-4 py-2'
                      : 'rounded-full border border-border dark:border-border-dark px-4 py-2'
                  }>
                  <Text
                    className={
                      selected
                        ? 'text-sm font-semibold text-surface dark:text-background-dark'
                        : 'text-sm text-foreground dark:text-foreground-dark'
                    }>
                    {localizeSymptomKey(label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">{t('log.mood')}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {moodOptions.map((label) => {
              const selected = selectedMoods.includes(label);
              return (
                <Pressable
                  key={label}
                  onPress={() => setSelectedMoods((current) => toggleItem(current, label))}
                  className={
                    selected
                      ? 'rounded-full bg-secondary px-4 py-2'
                      : 'rounded-full border border-border dark:border-border-dark px-4 py-2'
                  }>
                  <Text
                    className={
                      selected
                        ? 'text-sm font-semibold text-foreground'
                        : 'text-sm text-foreground dark:text-foreground-dark'
                    }>
                    {localizeMoodKey(label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
