import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Localization from 'expo-localization';

import { loadSettings, saveSettings } from './storage';
import { LanguageCode, setLocale } from '@/lib/i18n';

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const supported: LanguageCode[] = ['en', 'de', 'tr'];

function detectDeviceLanguage(): LanguageCode {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
  return supported.includes(locale as LanguageCode) ? (locale as LanguageCode) : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    loadSettings().then((settings) => {
      const lang = settings.languageCode ?? detectDeviceLanguage();
      setLanguageState(lang);
      setLocale(lang);
    });
  }, []);

  const setLanguage = async (next: LanguageCode) => {
    setLanguageState(next);
    setLocale(next);
    const current = await loadSettings();
    await saveSettings({ ...current, languageCode: next });
  };

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
