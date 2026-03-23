import React, { createContext, useContext, useMemo } from 'react';
import type { Language } from './translations';
import { translations } from './translations';

type I18nContextValue = {
  language: Language;
  setLanguage: (l: Language) => Promise<void> | void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  language,
  setLanguage,
  children,
}: {
  language: Language;
  setLanguage: (l: Language) => Promise<void> | void;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  const t = (key: string) => translations[ctx.language]?.[key] ?? key;
  return { language: ctx.language, setLanguage: ctx.setLanguage, t };
}

