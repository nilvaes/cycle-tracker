type CycleRange = {
  min: number;
  max: number;
};

export type CyclePrediction = {
  averageCycleDays: number | null;
  cycleRange: CycleRange | null;
  confidence: 'low' | 'medium' | 'high' | null;
  nextPeriodStartIso: string | null;
  expectedStartIso: string | null;
  expectedEndIso: string | null;
  daysUntilNext: number | null;
  fertileStartIso: string | null;
  ovulationIso: string | null;
  fertileEndIso: string | null;
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetweenIso(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function quantile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function iqrFilter(values: number[]) {
  if (values.length < 4) return values;
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const low = q1 - iqr * 1.5;
  const high = q3 + iqr * 1.5;
  const filtered = values.filter((v) => v >= low && v <= high);
  return filtered.length > 0 ? filtered : values;
}

function weightedAverage(values: number[]) {
  const weightedTotal = values.reduce((sum, value, index) => sum + value * (index + 1), 0);
  const weightTotal = values.reduce((sum, _value, index) => sum + (index + 1), 0);
  return Math.round(weightedTotal / Math.max(1, weightTotal));
}

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function buildCyclePrediction(startDates: string[], today = new Date()): CyclePrediction {
  if (startDates.length < 2) {
    return {
      averageCycleDays: null,
      cycleRange: null,
      confidence: null,
      nextPeriodStartIso: null,
      expectedStartIso: null,
      expectedEndIso: null,
      daysUntilNext: null,
      fertileStartIso: null,
      ovulationIso: null,
      fertileEndIso: null,
    };
  }

  const sorted = [...startDates].sort((a, b) => (a > b ? 1 : -1));
  const rawDiffs: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const diff = daysBetweenIso(sorted[i - 1], sorted[i]);
    if (diff > 0) rawDiffs.push(diff);
  }
  if (rawDiffs.length === 0) {
    return {
      averageCycleDays: null,
      cycleRange: null,
      confidence: null,
      nextPeriodStartIso: null,
      expectedStartIso: null,
      expectedEndIso: null,
      daysUntilNext: null,
      fertileStartIso: null,
      ovulationIso: null,
      fertileEndIso: null,
    };
  }

  const plausible = rawDiffs.filter((d) => d >= 15 && d <= 60);
  const base = plausible.length > 0 ? plausible : rawDiffs;
  const filtered = iqrFilter(base);
  const recent = filtered.slice(-6);

  const averageCycleDays = weightedAverage(recent);
  const cycleRange = {
    min: Math.min(...recent),
    max: Math.max(...recent),
  };
  const spread = cycleRange.max - cycleRange.min;
  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (recent.length >= 4 && spread <= 3) {
    confidence = 'high';
  } else if (recent.length >= 3 && spread <= 7) {
    confidence = 'medium';
  }

  const todayIso = toIsoDate(today);
  const lastStartIso = sorted[sorted.length - 1];
  let nextPeriodStartIso = addDays(lastStartIso, averageCycleDays);
  let expectedStartIso = addDays(lastStartIso, cycleRange.min);
  let expectedEndIso = addDays(lastStartIso, cycleRange.max);
  while (nextPeriodStartIso <= todayIso) {
    nextPeriodStartIso = addDays(nextPeriodStartIso, averageCycleDays);
  }
  while (expectedEndIso <= todayIso) {
    expectedStartIso = addDays(expectedStartIso, averageCycleDays);
    expectedEndIso = addDays(expectedEndIso, averageCycleDays);
  }

  const daysUntilNext = daysBetweenIso(todayIso, nextPeriodStartIso);
  const ovulationIso = addDays(nextPeriodStartIso, -14);
  const fertileStartIso = addDays(ovulationIso, -5);
  const fertileEndIso = ovulationIso;

  return {
    averageCycleDays,
    cycleRange,
    confidence,
    nextPeriodStartIso,
    expectedStartIso,
    expectedEndIso,
    daysUntilNext,
    fertileStartIso,
    ovulationIso,
    fertileEndIso,
  };
}
