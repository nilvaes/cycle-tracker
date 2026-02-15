import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DATA_CHANGED_EVENT } from '@/lib/events';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';
import { DailyNote, deleteNote, listNotes } from '@/lib/notes';
import { localizeOptionList } from '@/lib/options';
import { schedulePeriodReminder } from '@/lib/reminders';
import {
  deletePeriod,
  listPeriods,
  PeriodEntry,
  updatePeriod,
} from '@/lib/periods';
import { loadSettings, saveSettings } from '@/lib/storage';
import { deleteSymptomLog, listSymptomLogs, SymptomLog } from '@/lib/symptoms';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function HomeScreen() {
  const { language } = useLanguage();
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t('greeting.morning');
    if (hour >= 12 && hour < 18) return t('greeting.afternoon');
    if (hour >= 18 && hour < 23) return t('greeting.evening');
    return t('greeting.night');
  })();
  const colorScheme = useColorScheme();
  const iconColor = Colors[colorScheme ?? 'light'].icon;
  const [latestPeriod, setLatestPeriod] = useState<PeriodEntry | null>(null);
  const [recentPeriods, setRecentPeriods] = useState<PeriodEntry[]>([]);
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([]);
  const [allPeriods, setAllPeriods] = useState<PeriodEntry[]>([]);
  const [allSymptoms, setAllSymptoms] = useState<SymptomLog[]>([]);
  const [recentNotes, setRecentNotes] = useState<DailyNote[]>([]);
  const [allNotes, setAllNotes] = useState<DailyNote[]>([]);
  const [nextPeriodDate, setNextPeriodDate] = useState<string | null>(null);
  const [daysUntilNext, setDaysUntilNext] = useState<number | null>(null);
  const [cycleAverage, setCycleAverage] = useState<number | null>(null);
  const [cycleRange, setCycleRange] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [cycleDay, setCycleDay] = useState<number | null>(null);
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);

  const formatDisplayDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
  };

  const daysBetween = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const ms = end.getTime() - start.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  };

  const load = useCallback(async () => {
    const periods = await listPeriods();
    const symptoms = await listSymptomLogs();
    const notes = await listNotes();

    setLatestPeriod(periods[0] ?? null);
    setAllPeriods(periods);
    setAllSymptoms(symptoms);
    setRecentPeriods(periods.slice(0, 3));
    setRecentSymptoms(symptoms.slice(0, 2));
    setAllNotes(notes);
    setRecentNotes(notes.slice(0, 2));

    if (periods.length >= 2) {
      const sorted = [...periods].sort((a, b) =>
        a.startDate > b.startDate ? 1 : -1,
      );
      const diffs: number[] = [];
      for (let i = 1; i < sorted.length; i += 1) {
        diffs.push(daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
      }
      const avg =
        diffs.reduce((sum, v) => sum + v, 0) / Math.max(1, diffs.length);
      const min = Math.min(...diffs);
      const max = Math.max(...diffs);
      setCycleAverage(Math.round(avg));
      setCycleRange({ min, max });
      const lastStart = new Date(sorted[sorted.length - 1].startDate);
      const predicted = new Date(lastStart);
      predicted.setDate(lastStart.getDate() + Math.round(avg));
      const iso = predicted.toISOString().slice(0, 10);
      setNextPeriodDate(iso);

      const todayIso = new Date().toISOString().slice(0, 10);
      setDaysUntilNext(daysBetween(todayIso, iso));
    } else {
      setNextPeriodDate(null);
      setDaysUntilNext(null);
      setCycleAverage(null);
      setCycleRange(null);
    }

    if (periods.length >= 1) {
      const todayIso = new Date().toISOString().slice(0, 10);
      setCycleDay(daysBetween(periods[0].startDate, todayIso) + 1);
    } else {
      setCycleDay(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => {
      sub.remove();
    };
  }, [load]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const togglePeriods = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllPeriods((prev) => !prev);
  };

  const toggleSymptoms = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllSymptoms((prev) => !prev);
  };

  const toggleNotes = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllNotes((prev) => !prev);
  };

  const handleDeletePeriod = (id: number) => {
    Alert.alert(t('alerts.deletePeriodTitle'), t('alerts.deletePeriodBody'), [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: t('actions.delete'),
        style: 'destructive',
        onPress: async () => {
          await deletePeriod(id);
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
          load();
        },
      },
    ]);
  };

  const handleEndPeriod = () => {
    if (!latestPeriod) return;
    Alert.alert(t('alerts.endPeriodTitle'), t('alerts.endPeriodBody'), [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: t('actions.endToday'),
        onPress: async () => {
          const today = new Date();
          const day = String(today.getDate()).padStart(2, '0');
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const year = today.getFullYear();
          const iso = `${year}-${month}-${day}`;
          await updatePeriod({
            id: latestPeriod.id,
            startDate: latestPeriod.startDate,
            endDate: iso,
            flowIntensity: latestPeriod.flowIntensity,
          });
          const current = await loadSettings();
          const reminderId = await schedulePeriodReminder(current);
          await saveSettings({
            ...current,
            periodReminderNotificationId: reminderId,
          });
          load();
        },
      },
    ]);
  };

  const handleDeleteSymptom = (id: number) => {
    Alert.alert(t('alerts.deleteSymptomTitle'), t('alerts.deleteSymptomBody'), [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: t('actions.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteSymptomLog(id);
          load();
        },
      },
    ]);
  };

  const handleDeleteNote = (id: number) => {
    Alert.alert(t('alerts.deleteNoteTitle'), t('alerts.deleteNoteBody'), [
      { text: t('actions.cancel'), style: 'cancel' },
      {
        text: t('actions.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteNote(id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      key={`home-${language}`}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-6 pt-8">
          <View className="mb-6">
            <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
              {greeting}
            </Text>
            <Text className="mt-2 text-base text-muted dark:text-muted-dark">
              {t('home.tagline')}
            </Text>
          </View>

          <View className="mb-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
            <Text className="text-sm uppercase tracking-wide text-muted dark:text-muted-dark">
              {t('home.nextPeriod')}
            </Text>
            <Text className="mt-2 text-3xl font-semibold text-foreground dark:text-foreground-dark">
              {daysUntilNext !== null
                ? t('home.inDays', { days: daysUntilNext })
                : latestPeriod
                  ? t('home.logMore')
                  : t('home.logFirst')}
            </Text>
            <Text className="mt-1 text-base text-muted dark:text-muted-dark">
              {nextPeriodDate
                ? t('home.estimated', {
                    date: formatDisplayDate(nextPeriodDate),
                  })
                : ''}
            </Text>
            <Pressable
              className="mt-2 w-full rounded-none border-2 border-primary/70 bg-primary/10 dark:border-primary-dark/80 dark:bg-primary-dark/20 px-6 py-4 active:scale-95 active:opacity-80"
              onPress={
                latestPeriod && !latestPeriod.endDate
                  ? handleEndPeriod
                  : () => router.push('/log')
              }
            >
              <Text className="text-base font-semibold text-primary dark:text-primary-dark">
                {latestPeriod && !latestPeriod.endDate
                  ? t('home.endPeriod')
                  : t('home.addPeriod')}
              </Text>
            </Pressable>
          </View>

          <View className="mb-4 flex-row gap-4">
            <View className="flex-1 rounded-2xl bg-secondary p-4">
              <Text className="text-sm text-foreground">
                {t('home.cycleDay')}
              </Text>
              <Text className="mt-2 text-2xl font-semibold text-foreground">
                {cycleDay ? t('home.cycleDayValue', { day: cycleDay }) : '—'}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-accent p-4">
              <Text className="text-sm text-foreground">
                {t('home.avgLength')}
              </Text>
              <Text className="mt-2 text-2xl font-semibold text-foreground">
                {cycleAverage
                  ? t('home.avgLengthValue', { days: cycleAverage })
                  : '—'}
              </Text>
              {cycleRange && cycleRange.min !== cycleRange.max ? (
                <Text className="mt-1 text-xs text-foreground">
                  {t('home.range', {
                    min: cycleRange.min,
                    max: cycleRange.max,
                  })}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              {t('home.checkIn')}
            </Text>
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              {t('home.howFeeling')}
            </Text>
            <Pressable
              className="mt-4 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
              onPress={() => router.push('/symptoms')}
            >
              <Text className="text-sm font-semibold text-primary">
                {t('home.addSymptoms')}
              </Text>
            </Pressable>
            <Pressable
              className="mt-3 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
              onPress={() => router.push('/note')}
            >
              <Text className="text-sm font-semibold text-primary">
                {t('home.addNote')}
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
            <Pressable
              className="flex-row items-center justify-between active:opacity-80"
              onPress={togglePeriods}
            >
              <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
                {t('home.recentPeriods')}
              </Text>
              <IconSymbol
                size={18}
                name={showAllPeriods ? 'chevron.up' : 'chevron.down'}
                color={iconColor}
              />
            </Pressable>
            {recentPeriods.length === 0 ? (
              <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                {t('home.emptyPeriods')}
              </Text>
            ) : (
              <Animated.View
                key={showAllPeriods ? 'periods-expanded' : 'periods-collapsed'}
                layout={Layout.springify()}
                className="mt-3 gap-2"
              >
                {(showAllPeriods ? allPeriods : recentPeriods).map((period) => (
                  <View
                    key={period.id}
                    className="flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-4 py-3"
                  >
                    <View>
                      <Text className="text-sm text-foreground dark:text-foreground-dark">
                        {formatDisplayDate(period.startDate)}
                      </Text>
                      <Text className="text-xs text-muted dark:text-muted-dark capitalize">
                        {t(`log.${period.flowIntensity}`)}
                      </Text>
                    </View>
                    <Pressable
                      className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                      onPress={() => handleDeletePeriod(period.id)}
                    >
                      <IconSymbol size={16} name="trash" color={iconColor} />
                    </Pressable>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>

          <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
            <Pressable
              className="flex-row items-center justify-between active:opacity-80"
              onPress={toggleSymptoms}
            >
              <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
                {t('home.recentSymptoms')}
              </Text>
              <IconSymbol
                size={18}
                name={showAllSymptoms ? 'chevron.up' : 'chevron.down'}
                color={iconColor}
              />
            </Pressable>
            {recentSymptoms.length === 0 ? (
              <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                {t('home.emptySymptoms')}
              </Text>
            ) : (
              <Animated.View
                key={
                  showAllSymptoms ? 'symptoms-expanded' : 'symptoms-collapsed'
                }
                layout={Layout.springify()}
                className="mt-3 gap-3"
              >
                {(showAllSymptoms ? allSymptoms : recentSymptoms).map((log) => (
                  <View
                    key={log.id}
                    className="flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-4 py-3"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-sm text-foreground dark:text-foreground-dark">
                        {formatDisplayDate(log.logDate)}
                      </Text>
                      <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                        {t('home.symptomsLabel')}:{' '}
                        {localizeOptionList('symptom', log.symptoms).join(
                          ', ',
                        ) || t('common.none')}
                      </Text>
                      <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                        {t('home.moodLabel')}:{' '}
                        {localizeOptionList('mood', log.moods).join(', ') ||
                          t('common.none')}
                      </Text>
                    </View>
                    <Pressable
                      className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                      onPress={() => handleDeleteSymptom(log.id)}
                    >
                      <IconSymbol size={16} name="trash" color={iconColor} />
                    </Pressable>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>

          <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
            <Pressable
              className="flex-row items-center justify-between active:opacity-80"
              onPress={toggleNotes}
            >
              <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
                {t('home.recentNotes')}
              </Text>
              <IconSymbol
                size={18}
                name={showAllNotes ? 'chevron.up' : 'chevron.down'}
                color={iconColor}
              />
            </Pressable>
            {recentNotes.length === 0 ? (
              <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                {t('home.emptyNotes')}
              </Text>
            ) : (
              <Animated.View
                key={showAllNotes ? 'notes-expanded' : 'notes-collapsed'}
                layout={Layout.springify()}
                className="mt-3 gap-3"
              >
                {(showAllNotes ? allNotes : recentNotes).map((note) => (
                  <View
                    key={note.id}
                    className="flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-4 py-3"
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-sm text-foreground dark:text-foreground-dark">
                        {formatDisplayDate(note.logDate)}
                      </Text>
                      <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                        {note.text}
                      </Text>
                    </View>
                    <Pressable
                      className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                      onPress={() => handleDeleteNote(note.id)}
                    >
                      <IconSymbol size={16} name="trash" color={iconColor} />
                    </Pressable>
                  </View>
                ))}
              </Animated.View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
