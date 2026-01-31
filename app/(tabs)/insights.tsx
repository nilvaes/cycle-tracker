import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { listPeriods, PeriodEntry } from '@/lib/periods';
import { listSymptomLogs, SymptomLog } from '@/lib/symptoms';

function daysBetween(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function mostCommon(items: string[]) {
  if (items.length === 0) return null;
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let winner: string | null = null;
  let max = 0;
  for (const [key, value] of counts.entries()) {
    if (value > max) {
      max = value;
      winner = key;
    }
  }
  return winner;
}

function buildCycleLengths(periods: PeriodEntry[]) {
  if (periods.length < 2) return [];
  const sorted = [...periods].sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    diffs.push(daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
  }
  return diffs.slice(-6);
}

function buildSymptomCounts(logs: SymptomLog[]) {
  const counts = new Map<string, number>();
  for (const log of logs) {
    for (const s of log.symptoms) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

export default function InsightsScreen() {
  const [periods, setPeriods] = useState<PeriodEntry[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);

  const load = useCallback(async () => {
    const [periodData, symptomData] = await Promise.all([listPeriods(), listSymptomLogs()]);
    setPeriods(periodData);
    setSymptomLogs(symptomData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const averageCycle = useMemo(() => {
    if (periods.length < 2) return null;
    const sorted = [...periods].sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
    const diffs: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      diffs.push(daysBetween(sorted[i - 1].startDate, sorted[i].startDate));
    }
    const total = diffs.reduce((sum, value) => sum + value, 0);
    return Math.round(total / diffs.length);
  }, [periods]);

  const mostCommonSymptom = useMemo(() => {
    const all = symptomLogs.flatMap((log) => log.symptoms);
    return mostCommon(all);
  }, [symptomLogs]);

  const mostCommonMood = useMemo(() => {
    const all = symptomLogs.flatMap((log) => log.moods);
    return mostCommon(all);
  }, [symptomLogs]);

  const cycleLengths = useMemo(() => buildCycleLengths(periods), [periods]);
  const symptomCounts = useMemo(() => buildSymptomCounts(symptomLogs), [symptomLogs]);
  const maxCycle = Math.max(...cycleLengths, 0);
  const maxSymptom = Math.max(...symptomCounts.map(([, count]) => count), 0);

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView>
        <View className="px-6 pt-8 pb-10">
        <Text className="text-3xl font-semibold text-foreground dark:text-foreground-dark">
          Insights
        </Text>
        <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
          Your cycle stats update as you log more data.
        </Text>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-sm uppercase tracking-wide text-muted dark:text-muted-dark">
            Average cycle length
          </Text>
          <Text className="mt-2 text-3xl font-semibold text-foreground dark:text-foreground-dark">
            {averageCycle ? `${averageCycle} days` : 'Log 2+ cycles'}
          </Text>
          <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
            Log at least two periods to calculate this.
          </Text>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Cycle length trend
          </Text>
          {cycleLengths.length === 0 ? (
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Log at least two periods to see trends.
            </Text>
          ) : (
            <View className="mt-3 flex-row items-end gap-2">
              {cycleLengths.map((value, index) => (
                <View key={`${value}-${index}`} className="items-center">
                  <View
                    className="w-6 rounded-t bg-primary"
                    style={{
                      height: Math.max(12, Math.round((value / maxCycle) * 80)),
                    }}
                  />
                  <Text className="mt-2 text-[10px] text-muted dark:text-muted-dark">
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="mt-5 flex-row gap-4">
          <View className="flex-1 rounded-2xl bg-secondary p-4">
            <Text className="text-sm text-foreground">Periods logged</Text>
            <Text className="mt-2 text-2xl font-semibold text-foreground">{periods.length}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-accent p-4">
            <Text className="text-sm text-foreground">Symptom logs</Text>
            <Text className="mt-2 text-2xl font-semibold text-foreground">
              {symptomLogs.length}
            </Text>
          </View>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Most common symptoms
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            {mostCommonSymptom ?? 'Log symptoms to see patterns.'}
          </Text>
          <Text className="mt-4 text-lg font-semibold text-foreground dark:text-foreground-dark">
            Most common mood
          </Text>
          <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
            {mostCommonMood ?? 'No moods logged yet.'}
          </Text>
        </View>

        <View className="mt-6 rounded-3xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-5">
          <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
            Symptom frequency
          </Text>
          {symptomCounts.length === 0 ? (
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              Log symptoms to see frequency.
            </Text>
          ) : (
            <View className="mt-3 gap-3">
              {symptomCounts.map(([label, count]) => (
                <View key={label}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-foreground dark:text-foreground-dark">
                      {label}
                    </Text>
                    <Text className="text-xs text-muted dark:text-muted-dark">{count}</Text>
                  </View>
                  <View className="mt-2 h-2 w-full rounded bg-accent dark:bg-accent-dark">
                    <View
                      className="h-2 rounded bg-primary"
                      style={{
                        width: `${Math.max(10, Math.round((count / maxSymptom) * 100))}%`,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
