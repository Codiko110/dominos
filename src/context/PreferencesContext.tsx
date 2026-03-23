import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Language } from '@/i18n/translations';
import { loadJSON, saveJSON } from '@/utils/storage';
import { getThemeColors, normalizeTheme, type AppTheme, type ThemeColors } from '@/theme/theme';

const STORAGE_KEYS = {
  theme: 'dominos:theme',
  language: 'dominos:language',
} as const;

type PreferencesContextValue = {
  theme: AppTheme;
  setTheme: (t: AppTheme) => Promise<void>;
  themeColors: ThemeColors;

  language: Language;
  setLanguage: (l: Language) => Promise<void>;

  ready: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('light');
  const [language, setLanguageState] = useState<Language>('fr');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedTheme = await loadJSON<AppTheme>(STORAGE_KEYS.theme, 'light');
      const savedLanguage = await loadJSON<Language>(STORAGE_KEYS.language, 'fr');
      if (!mounted) return;
      setThemeState(normalizeTheme(savedTheme));
      setLanguageState(savedLanguage);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setTheme = useCallback(async (t: AppTheme) => {
    const normalized = normalizeTheme(t);
    setThemeState(normalized);
    await saveJSON(STORAGE_KEYS.theme, normalized);
  }, []);

  const setLanguage = useCallback(async (l: Language) => {
    setLanguageState(l);
    await saveJSON(STORAGE_KEYS.language, l);
  }, []);

  const value = useMemo<PreferencesContextValue>(() => {
    const themeColors = getThemeColors(theme);
    return { theme, setTheme, themeColors, language, setLanguage, ready };
  }, [language, ready, setLanguage, setTheme, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}

