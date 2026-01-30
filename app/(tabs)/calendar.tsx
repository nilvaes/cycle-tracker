import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';

import { listPeriods, listPeriodsByDate, PeriodEntry } from '@/lib/periods';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { listSymptomLogsByDate, SymptomLog } from '@/lib/symptoms';
import { listNotesByDate, DailyNote } from '@/lib/notes';
import { router } from 'expo-router';

function buildMarkedDates(periods: PeriodEntry[], color: string, textColor: string) {
  const marked: Record<string, any> = {};
  for (const period of periods) {
    if (!period.startDate) continue;
    marked[period.startDate] = {
      startingDay: true,
      color,
      textColor,
    };
    if (period.endDate && period.endDate !== period.startDate) {
      marked[period.endDate] = {
        endingDay: true,
        color,
        textColor,
      };
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      const days = Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      );
      for (let i = 1; i < days; i += 1) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        marked[iso] = { color, textColor };
      }
    }
  }
  return marked;
}

function addPrediction(
  marked: Record<string, any>,
  periods: PeriodEntry[],
  color: string,
  textColor: string,
) {
  if (periods.length < 2) return marked;
  const sorted = [...periods].sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const start = new Date(sorted[i - 1].startDate);
    const next = new Date(sorted[i].startDate);
    diffs.push(
      Math.round((next.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }
  const avg =
    diffs.reduce((sum, value) => sum + value, 0) / Math.max(1, diffs.length);
  const last = new Date(sorted[sorted.length - 1].startDate);
  const predictedStart = new Date(last);
  predictedStart.setDate(last.getDate() + Math.round(avg));

  for (let i = 0; i < 5; i += 1) {
    const d = new Date(predictedStart);
    d.setDate(predictedStart.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (!marked[iso]) {
      marked[iso] = { color, textColor };
    }
  }
  return marked;
}

function addFertileWindow(
  marked: Record<string, any>,
  periods: PeriodEntry[],
  fertileColor: string,
  textColor: string,
) {
  if (periods.length < 2) return marked;
  const sorted = [...periods].sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const start = new Date(sorted[i - 1].startDate);
    const next = new Date(sorted[i].startDate);
    diffs.push(
      Math.round((next.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }
  const avg =
    diffs.reduce((sum, value) => sum + value, 0) / Math.max(1, diffs.length);
  const last = new Date(sorted[sorted.length - 1].startDate);
  const predictedStart = new Date(last);
  predictedStart.setDate(last.getDate() + Math.round(avg));

  const ovulation = new Date(predictedStart);
  ovulation.setDate(predictedStart.getDate() - 14);
  const fertileStart = new Date(ovulation);
  fertileStart.setDate(ovulation.getDate() - 5);

  for (let i = 0; i <= 5; i += 1) {
    const d = new Date(fertileStart);
    d.setDate(fertileStart.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (marked[iso]) {
      marked[iso] = {
        ...marked[iso],
        marked: true,
        dotColor: fertileColor,
        textColor: marked[iso].textColor ?? textColor,
      };
    } else {
      marked[iso] = { marked: true, dotColor: fertileColor, textColor };
    }
  }
  return marked;
}

export default function CalendarScreen() {
  const [periods, setPeriods] = useState<PeriodEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodEntry[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomLog[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<DailyNote[]>([]);
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const predictionColor = colorScheme === 'dark' ? '#3A322A' : '#F1E8DA';
  const fertileColor = palette.secondary;

  const formatDisplayDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
  };

  const load = useCallback(async () => {
    const periodData = await listPeriods();
    setPeriods(periodData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const markedDates = useMemo(() => {
    const base = buildMarkedDates(periods, palette.primary, palette.text);
    const predicted = addPrediction(base, periods, predictionColor, palette.text);
    return addFertileWindow(predicted, periods, fertileColor, palette.text);
  }, [periods, palette.primary, palette.text, predictionColor, fertileColor]);

  const handleDayPress = (dateString: string) => {
    setSelectedDate(dateString);
  };

  const loadDayDetails = useCallback(async (dateIso: string) => {
    const [dayPeriods, daySymptoms, dayNotes] = await Promise.all([
      listPeriodsByDate(dateIso),
      listSymptomLogsByDate(dateIso),
      listNotesByDate(dateIso),
    ]);
    setSelectedPeriods(dayPeriods);
    setSelectedSymptoms(daySymptoms);
    setSelectedNotes(dayNotes);
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    loadDayDetails(selectedDate);
  }, [selectedDate, loadDayDetails]);

  return (
    <ScrollView className="flex-1 bg-background dark:bg-background-dark">
      <View className="px-6 pt-8 pb-10">
        <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
          Calendar
        </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          Your logged periods are highlighted.
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-3">
          <View className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full bg-primary" />
            <Text className="text-xs text-muted dark:text-muted-dark">Logged period</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: predictionColor }} />
            <Text className="text-xs text-muted dark:text-muted-dark">Predicted</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: fertileColor }} />
            <Text className="text-xs text-muted dark:text-muted-dark">Fertile window</Text>
          </View>
        </View>

          <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Calendar
            markingType="period"
            markedDates={markedDates}
            onDayPress={(day) => handleDayPress(day.dateString)}
            theme={{
              backgroundColor: palette.surface,
              calendarBackground: palette.surface,
              textSectionTitleColor: palette.mutedText,
              selectedDayBackgroundColor: palette.primary,
              selectedDayTextColor: palette.text,
              todayTextColor: palette.primary,
              dayTextColor: palette.text,
              monthTextColor: palette.text,
              arrowColor: palette.primary,
            }}
            key={`calendar-${colorScheme}`}
          />
        </View>

        {selectedDate ? (
          <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              Details for {formatDisplayDate(selectedDate)}
            </Text>

            <View className="mt-3">
              <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                Periods
              </Text>
              {selectedPeriods.length === 0 ? (
                <Text className="mt-1 text-xs text-muted dark:text-muted-dark">None</Text>
              ) : (
                selectedPeriods.map((period) => (
                  <View
                    key={period.id}
                    className="mt-2 flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-3 py-2">
                    <Text className="text-xs text-muted dark:text-muted-dark capitalize">
                      {period.flowIntensity}
                    </Text>
                    <Text
                      className="text-xs text-primary"
                      onPress={() => router.push(`/log?editId=${period.id}`)}>
                      Edit
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                Symptoms
              </Text>
              {selectedSymptoms.length === 0 ? (
                <Text className="mt-1 text-xs text-muted dark:text-muted-dark">None</Text>
              ) : (
                selectedSymptoms.map((log) => (
                  <Text key={log.id} className="mt-1 text-xs text-muted dark:text-muted-dark">
                    {log.symptoms.join(', ') || 'None'} · {log.moods.join(', ') || 'None'}
                  </Text>
                ))
              )}
            </View>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                Notes
              </Text>
              {selectedNotes.length === 0 ? (
                <Text className="mt-1 text-xs text-muted dark:text-muted-dark">None</Text>
              ) : (
                selectedNotes.map((note) => (
                  <Text key={note.id} className="mt-1 text-xs text-muted dark:text-muted-dark">
                    {note.text}
                  </Text>
                ))
              )}
            </View>
          </View>
        ) : null}

        <Text className="mt-4 text-xs text-muted dark:text-muted-dark">
          Predictions and fertility windows are estimates and may vary.
        </Text>
      </View>
    </ScrollView>
  );
}
