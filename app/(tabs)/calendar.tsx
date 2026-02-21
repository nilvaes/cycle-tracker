import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';

import { deletePeriod, listPeriods, listPeriodsByDate, PeriodEntry } from '@/lib/periods';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteSymptomLog, listSymptomLogsByDate, SymptomLog } from '@/lib/symptoms';
import { deleteNote, listNotesByDate, DailyNote } from '@/lib/notes';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';
import { localizeOptionList } from '@/lib/options';
import { buildCyclePrediction } from '@/lib/predictions';
import { loadSettings, saveSettings } from '@/lib/storage';
import { schedulePeriodReminder } from '@/lib/reminders';

const calendarLocales = {
  en: {
    monthNames: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    today: 'Today',
  },
  de: {
    monthNames: [
      'Januar',
      'Februar',
      'März',
      'April',
      'Mai',
      'Juni',
      'Juli',
      'August',
      'September',
      'Oktober',
      'November',
      'Dezember',
    ],
    monthNamesShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    dayNamesShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    today: 'Heute',
  },
  tr: {
    monthNames: [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ],
    monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
    dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
    dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
    today: 'Bugün',
  },
};

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
  predictedStartIso: string | null,
  color: string,
  textColor: string,
) {
  if (!predictedStartIso) return marked;
  for (let i = 0; i < 5; i += 1) {
    const d = new Date(predictedStartIso);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (!marked[iso]) {
      marked[iso] = { color, textColor };
    }
  }
  return marked;
}

function addFertileWindow(
  marked: Record<string, any>,
  fertileStartIso: string | null,
  fertileEndIso: string | null,
  fertileColor: string,
  textColor: string,
) {
  if (!fertileStartIso || !fertileEndIso) return marked;
  const start = new Date(fertileStartIso);
  const end = new Date(fertileEndIso);
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
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
  const { language } = useLanguage();
  const [periods, setPeriods] = useState<PeriodEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<PeriodEntry[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomLog[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<DailyNote[]>([]);
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const predictionColor = colorScheme === 'dark' ? '#3A322A' : '#F1E8DA';
  // Keep fertile window visually distinct from period gold and prediction beige.
  const fertileColor = colorScheme === 'dark' ? '#6FA38B' : '#2F8F78';

  const formatDisplayDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    LocaleConfig.locales.en = calendarLocales.en;
    LocaleConfig.locales.de = calendarLocales.de;
    LocaleConfig.locales.tr = calendarLocales.tr;
    LocaleConfig.defaultLocale = language;
  }, [language]);

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
    const prediction = buildCyclePrediction(periods.map((p) => p.startDate));
    const base = buildMarkedDates(periods, palette.primary, palette.text);
    const predicted = addPrediction(base, prediction.nextPeriodStartIso, predictionColor, palette.text);
    return addFertileWindow(
      predicted,
      prediction.fertileStartIso,
      prediction.fertileEndIso,
      fertileColor,
      palette.text,
    );
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

  useFocusEffect(
    useCallback(() => {
      if (selectedDate) {
        loadDayDetails(selectedDate);
      }
    }, [selectedDate, loadDayDetails]),
  );

  const reconcilePeriodReminder = async () => {
    const remaining = await listPeriods();
    const current = await loadSettings();
    const next = {
      ...current,
      lastPeriodStartDate: remaining[0]?.startDate ?? null,
    };
    const reminderId = await schedulePeriodReminder(next);
    await saveSettings({
      ...next,
      periodReminderNotificationId: reminderId,
    });
  };

  return (
    <SafeAreaView
      key={`calendar-${language}`}
      className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView>
        <View className="px-6 pt-8 pb-10">
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
            {t('calendar.title')}
          </Text>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
            onPress={() =>
              Alert.alert(
                t('calendar.tipsTitle'),
                t('calendar.tipsBody'),
              )
            }>
            <IconSymbol size={18} name="questionmark.circle" color={palette.icon} />
          </Pressable>
        </View>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          {t('calendar.highlighted')}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-3">
          <View className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full bg-primary" />
            <Text className="text-xs text-muted dark:text-muted-dark">{t('calendar.logged')}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: predictionColor }} />
            <Text className="text-xs text-muted dark:text-muted-dark">{t('calendar.predicted')}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: fertileColor }} />
            <Text className="text-xs text-muted dark:text-muted-dark">{t('calendar.fertile')}</Text>
          </View>
        </View>

          <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-4">
          <Calendar
            markingType="period"
            markedDates={markedDates}
            onDayPress={(day) => handleDayPress(day.dateString)}
            onDayLongPress={(day) =>
              Alert.alert(t('alerts.quickAddTitle'), t('alerts.quickAddBody'), [
                {
                  text: t('actions.addPeriod'),
                  onPress: () => router.push(`/log?date=${day.dateString}`),
                },
                {
                  text: t('actions.addSymptoms'),
                  onPress: () => router.push(`/symptoms?date=${day.dateString}`),
                },
                {
                  text: t('actions.addNote'),
                  onPress: () => router.push(`/note?date=${day.dateString}`),
                },
                { text: t('actions.cancel'), style: 'cancel' },
              ])
            }
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
              {t('calendar.detailsFor', { date: formatDisplayDate(selectedDate) })}
            </Text>

            <View className="mt-3">
              <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                {t('calendar.periods')}
              </Text>
              {selectedPeriods.length === 0 ? (
                <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                  {t('calendar.nonePeriod')}
                </Text>
              ) : (
                selectedPeriods.map((period) => (
                  <View
                    key={period.id}
                    className="mt-2 flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-3 py-2">
                    <Text className="text-xs text-muted dark:text-muted-dark capitalize">
                      {t(`log.${period.flowIntensity}`)}
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                        onPress={() => router.push(`/log?editId=${period.id}`)}>
                        <IconSymbol size={16} name="pencil" color={palette.icon} />
                      </Pressable>
                      <Pressable
                        className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                        onPress={() => {
                          Alert.alert(t('alerts.deletePeriodTitle'), t('alerts.deletePeriodBody'), [
                            { text: t('actions.cancel'), style: 'cancel' },
                            {
                              text: t('actions.delete'),
                              style: 'destructive',
                              onPress: async () => {
                                await deletePeriod(period.id);
                                await reconcilePeriodReminder();
                                await load();
                                if (selectedDate) {
                                  await loadDayDetails(selectedDate);
                                }
                              },
                            },
                          ]);
                        }}>
                        <IconSymbol size={16} name="trash" color={palette.icon} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                {t('calendar.symptoms')}
              </Text>
              {selectedSymptoms.length === 0 ? (
                <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                  {t('calendar.noneSymptoms')}
                </Text>
              ) : (
                selectedSymptoms.map((log) => (
                  <View
                    key={log.id}
                    className="mt-2 flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-3 py-2">
                    <Text className="text-xs text-muted dark:text-muted-dark">
                      {localizeOptionList('symptom', log.symptoms).join(', ') || t('common.none')} ·{' '}
                      {localizeOptionList('mood', log.moods).join(', ') || t('common.none')}
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                        onPress={() => router.push(`/symptoms?editId=${log.id}`)}>
                        <IconSymbol size={16} name="pencil" color={palette.icon} />
                      </Pressable>
                      <Pressable
                        className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                        onPress={async () => {
                          Alert.alert(t('alerts.deleteSymptomTitle'), t('alerts.deleteSymptomBody'), [
                            { text: t('actions.cancel'), style: 'cancel' },
                            {
                              text: t('actions.delete'),
                              style: 'destructive',
                              onPress: async () => {
                                await deleteSymptomLog(log.id);
                                if (selectedDate) loadDayDetails(selectedDate);
                              },
                            },
                          ]);
                        }}>
                        <IconSymbol size={16} name="trash" color={palette.icon} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-foreground dark:text-foreground-dark">
                {t('calendar.notes')}
              </Text>
              {selectedNotes.length === 0 ? (
                <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                  {t('calendar.noneNotes')}
                </Text>
              ) : (
                selectedNotes.map((note) => (
                  <View
                    key={note.id}
                    className="mt-2 flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-3 py-2">
                    <Text className="text-xs text-muted dark:text-muted-dark">{note.text}</Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                        onPress={() => router.push(`/note?editId=${note.id}`)}>
                        <IconSymbol size={16} name="pencil" color={palette.icon} />
                      </Pressable>
                      <Pressable
                        className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                        onPress={async () => {
                          Alert.alert(t('alerts.deleteNoteTitle'), t('alerts.deleteNoteBody'), [
                            { text: t('actions.cancel'), style: 'cancel' },
                            {
                              text: t('actions.delete'),
                              style: 'destructive',
                              onPress: async () => {
                                await deleteNote(note.id);
                                if (selectedDate) loadDayDetails(selectedDate);
                              },
                            },
                          ]);
                        }}>
                        <IconSymbol size={16} name="trash" color={palette.icon} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}

        <Text className="mt-4 text-xs text-muted dark:text-muted-dark">
          {t('calendar.disclaimer')}
        </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
