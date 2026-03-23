import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '@/utils/storage';
import { getThemeColors, normalizeTheme, type AppTheme, type ThemeColors } from '@/theme/theme';
import type { Language } from '@/i18n/translations';

type PreferencesContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  themeColors: ThemeColors;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const THEME_KEY = 'theme';
const LANGUAGE_KEY = 'language';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('light');
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const loadPreferences = async () => {
      const savedTheme = await loadJSON<AppTheme>(THEME_KEY, 'light');
      const savedLanguage = await loadJSON<Language>(LANGUAGE_KEY, 'en');
      setThemeState(normalizeTheme(savedTheme));
      setLanguageState(savedLanguage);
    };
    loadPreferences();
  }, []);

  const setTheme = async (newTheme: AppTheme) => {
    setThemeState(newTheme);
    await saveJSON(THEME_KEY, newTheme);
  };

  const setLanguage = async (newLanguage: Language) => {
    setLanguageState(newLanguage);
    await saveJSON(LANGUAGE_KEY, newLanguage);
  };

  const themeColors = getThemeColors(theme);

  const value: PreferencesContextValue = {
    theme,
    setTheme,
    language,
    setLanguage,
    themeColors,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return ctx;
}