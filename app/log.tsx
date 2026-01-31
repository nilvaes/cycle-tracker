import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { createPeriod, FlowIntensity, getPeriodById, updatePeriod } from '@/lib/periods';
import { emitDataChanged } from '@/lib/events';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function LogPeriodScreen() {
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
    if (!date) return 'Select date';
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
      setError('End date cannot be before start date.');
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
      emitDataChanged();
      Alert.alert('Saved', editId ? 'Your period was updated.' : 'Your period has been logged.');
      router.back();
    } catch (e) {
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background dark:bg-background-dark">
      <View className="px-6 pt-12">
        <Text className="text-2xl font-semibold text-foreground dark:text-foreground-dark">
          {editId ? 'Edit period' : 'Add period'}
        </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          Add your period details. Dates use DD/MM/YYYY.
        </Text>

        <View className="mt-6 rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Text className="text-sm text-muted dark:text-muted-dark">Start date</Text>
          <Pressable onPress={() => setShowStartPicker(true)}>
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
          <Text className="text-sm text-muted dark:text-muted-dark">End date (optional)</Text>
          <Pressable onPress={() => setShowEndPicker(true)}>
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
          <Text className="text-sm text-muted dark:text-muted-dark">Flow intensity</Text>
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
                    {level}
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
              Cancel
            </Text>
          </Pressable>
          <Pressable
            className="rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={handleSave}
            disabled={saving}>
            <Text className="text-sm font-semibold text-primary">
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
