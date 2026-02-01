import {
  DeviceEventEmitter,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { deletePeriod, listPeriods, PeriodEntry, updatePeriod } from '@/lib/periods';
import { deleteSymptomLog, listSymptomLogs, SymptomLog } from '@/lib/symptoms';
import { deleteNote, listNotes, DailyNote } from '@/lib/notes';
import { useFocusEffect } from '@react-navigation/native';
import { DATA_CHANGED_EVENT } from '@/lib/events';
import Animated, { Layout } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
export default function HomeScreen() {
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    if (hour >= 18 && hour < 23) return 'Good evening';
    return 'Good night';
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
  const [cycleRange, setCycleRange] = useState<{ min: number; max: number } | null>(null);
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
      const sorted = [...periods].sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
      const diffs: number[] = [];
      for (let i = 1; i < sorted.length; i += 1) {
        diffs.push(daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
      }
      const avg = diffs.reduce((sum, v) => sum + v, 0) / Math.max(1, diffs.length);
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
    Alert.alert('Delete period?', 'This entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePeriod(id);
          load();
        },
      },
    ]);
  };

  const handleEndPeriod = () => {
    if (!latestPeriod) return;
    Alert.alert('End period?', 'Set end date to today?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End today',
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
          load();
        },
      },
    ]);
  };

  const handleDeleteSymptom = (id: number) => {
    Alert.alert('Delete symptom log?', 'This entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSymptomLog(id);
          load();
        },
      },
    ]);
  };

  const handleDeleteNote = (id: number) => {
    Alert.alert('Delete note?', 'This entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(id);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-6 pt-8">
        <View className="mb-6">
          <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
            {greeting}
          </Text>
          <Text className="mt-2 text-base text-muted dark:text-muted-dark">
            Let’s keep your cycle calm and clear.
          </Text>
        </View>

        <View className="mb-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-sm uppercase tracking-wide text-muted dark:text-muted-dark">
            Next period
          </Text>
          <Text className="mt-2 text-3xl font-semibold text-foreground dark:text-foreground-dark">
            {daysUntilNext !== null
              ? `In ${daysUntilNext} days`
              : latestPeriod
                ? 'Log one more period to predict'
                : 'Log your first period'}
          </Text>
          <Text className="mt-1 text-base text-muted dark:text-muted-dark">
            {nextPeriodDate
              ? `Estimated: ${formatDisplayDate(nextPeriodDate)}`
              : 'Log a period to start predictions.'}
          </Text>
          <View className="mt-4 flex-row gap-3">
            <Pressable
              className="rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
              onPress={latestPeriod && !latestPeriod.endDate ? handleEndPeriod : () => router.push('/log')}>
              <Text className="text-sm font-semibold text-primary">
                {latestPeriod && !latestPeriod.endDate ? 'End period' : 'Add period'}
              </Text>
            </Pressable>
            <Pressable
              className="rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
              onPress={() => router.push('/note')}>
              <Text className="text-sm font-semibold text-primary">Add note</Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-4 flex-row gap-4">
          <View className="flex-1 rounded-2xl bg-secondary p-4">
            <Text className="text-sm text-foreground">Cycle day</Text>
            <Text className="mt-2 text-2xl font-semibold text-foreground">
              {cycleDay ? `Day ${cycleDay}` : '—'}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-accent p-4">
            <Text className="text-sm text-foreground">Avg length</Text>
            <Text className="mt-2 text-2xl font-semibold text-foreground">
              {cycleAverage ? `${cycleAverage} days` : '—'}
            </Text>
            {cycleRange && cycleRange.min !== cycleRange.max ? (
              <Text className="mt-1 text-xs text-foreground">
                Range {cycleRange.min}–{cycleRange.max}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Today’s check‑in
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            How are you feeling?
          </Text>
          <Pressable
            className="mt-4 rounded-none border border-primary px-5 py-3 active:scale-95 active:opacity-80"
            onPress={() => router.push('/symptoms')}>
            <Text className="text-sm font-semibold text-primary">Add symptoms</Text>
          </Pressable>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Pressable
            className="flex-row items-center justify-between active:opacity-80"
            onPress={togglePeriods}>
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              Recent periods
            </Text>
            <IconSymbol
              size={18}
              name={showAllPeriods ? 'chevron.up' : 'chevron.down'}
              color={iconColor}
            />
          </Pressable>
          {recentPeriods.length === 0 ? (
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Your logged periods will appear here.
            </Text>
          ) : (
            <Animated.View
              key={showAllPeriods ? 'periods-expanded' : 'periods-collapsed'}
              layout={Layout.springify()}
              className="mt-3 gap-2">
              {(showAllPeriods ? allPeriods : recentPeriods).map((period) => (
                <View
                  key={period.id}
                  className="flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-4 py-3">
                  <View>
                    <Text className="text-sm text-foreground dark:text-foreground-dark">
                      {formatDisplayDate(period.startDate)}
                    </Text>
                    <Text className="text-xs text-muted dark:text-muted-dark capitalize">
                      {period.flowIntensity}
                    </Text>
                  </View>
                  <Pressable
                    className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                    onPress={() => handleDeletePeriod(period.id)}>
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
            onPress={toggleSymptoms}>
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              Recent symptoms
            </Text>
            <IconSymbol
              size={18}
              name={showAllSymptoms ? 'chevron.up' : 'chevron.down'}
              color={iconColor}
            />
          </Pressable>
          {recentSymptoms.length === 0 ? (
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Your symptom logs will appear here.
            </Text>
          ) : (
            <Animated.View
              key={showAllSymptoms ? 'symptoms-expanded' : 'symptoms-collapsed'}
              layout={Layout.springify()}
              className="mt-3 gap-3">
              {(showAllSymptoms ? allSymptoms : recentSymptoms).map((log) => (
                <View
                  key={log.id}
                  className="flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-4 py-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm text-foreground dark:text-foreground-dark">
                      {formatDisplayDate(log.logDate)}
                    </Text>
                    <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                      Symptoms: {log.symptoms.join(', ') || 'None'}
                    </Text>
                    <Text className="mt-1 text-xs text-muted dark:text-muted-dark">
                      Mood: {log.moods.join(', ') || 'None'}
                    </Text>
                  </View>
                  <Pressable
                    className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                    onPress={() => handleDeleteSymptom(log.id)}>
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
            onPress={toggleNotes}>
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              Recent notes
            </Text>
            <IconSymbol
              size={18}
              name={showAllNotes ? 'chevron.up' : 'chevron.down'}
              color={iconColor}
            />
          </Pressable>
          {recentNotes.length === 0 ? (
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Your notes will appear here.
            </Text>
          ) : (
            <Animated.View
              key={showAllNotes ? 'notes-expanded' : 'notes-collapsed'}
              layout={Layout.springify()}
              className="mt-3 gap-3">
              {(showAllNotes ? allNotes : recentNotes).map((note) => (
                <View
                  key={note.id}
                  className="flex-row items-center justify-between rounded-2xl border border-border dark:border-border-dark px-4 py-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm text-foreground dark:text-foreground-dark">
                      {formatDisplayDate(note.logDate)}
                    </Text>
                    <Text className="mt-1 text-xs text-muted dark:text-muted-dark">{note.text}</Text>
                  </View>
                  <Pressable
                    className="h-7 w-7 items-center justify-center rounded-full border border-border dark:border-border-dark active:opacity-80"
                    onPress={() => handleDeleteNote(note.id)}>
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
