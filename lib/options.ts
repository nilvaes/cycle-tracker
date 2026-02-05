import { t } from '@/lib/i18n';

type OptionType = 'symptom' | 'mood';

const normalize = (value: string) => value.trim().toLowerCase();

const symptomKeyByLabel: Record<string, string> = {
  cramps: 'cramps',
  'krämpfe': 'cramps',
  kramp: 'cramps',
  headache: 'headache',
  kopfschmerzen: 'headache',
  'baş ağrısı': 'headache',
  bloating: 'bloating',
  'blähungen': 'bloating',
  'şişkinlik': 'bloating',
  fatigue: 'fatigue',
  'müdigkeit': 'fatigue',
  yorgunluk: 'fatigue',
  nausea: 'nausea',
  'übelkeit': 'nausea',
  'mide bulantısı': 'nausea',
};

const moodKeyByLabel: Record<string, string> = {
  calm: 'calm',
  ruhig: 'calm',
  sakin: 'calm',
  'low energy': 'lowEnergy',
  'wenig energie': 'lowEnergy',
  'düşük enerji': 'lowEnergy',
  irritable: 'irritable',
  reizbar: 'irritable',
  asabi: 'irritable',
  anxious: 'anxious',
  'ängstlich': 'anxious',
  endişeli: 'anxious',
  happy: 'happy',
  glücklich: 'happy',
  mutlu: 'happy',
};

const symptomKeys = new Set(Object.values(symptomKeyByLabel));
const moodKeys = new Set(Object.values(moodKeyByLabel));

export function getOptionKey(type: OptionType, value: string) {
  const normalized = normalize(value);
  if (type === 'symptom') {
    return symptomKeyByLabel[normalized] ?? value;
  }
  return moodKeyByLabel[normalized] ?? value;
}

export function localizeOption(type: OptionType, value: string) {
  const key = getOptionKey(type, value);
  if (type === 'symptom' && symptomKeys.has(key)) {
    return t(`options.symptoms.${key}`);
  }
  if (type === 'mood' && moodKeys.has(key)) {
    return t(`options.moods.${key}`);
  }
  return value;
}

export function localizeOptionList(type: OptionType, values: string[]) {
  return values.map((value) => localizeOption(type, value));
}

export function localizeSymptomKey(key: string) {
  if (symptomKeys.has(key)) return t(`options.symptoms.${key}`);
  return key;
}

export function localizeMoodKey(key: string) {
  if (moodKeys.has(key)) return t(`options.moods.${key}`);
  return key;
}
