import React from 'react';
import { PreferencesProvider, usePreferences } from './PreferencesContext';
import { GameRoundsProvider } from './GameRoundsContext';
import { I18nProvider } from '@/i18n/useI18n';

function InnerProviders({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = usePreferences();
  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      {children}
    </I18nProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <GameRoundsProvider>
        <InnerProviders>{children}</InnerProviders>
      </GameRoundsProvider>
    </PreferencesProvider>
  );
}
