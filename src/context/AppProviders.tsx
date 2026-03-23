import React from 'react';
import { PreferencesProvider, usePreferences } from '@/context/PreferencesContext';
import { GameRoundsProvider } from '@/context/GameRoundsContext';
import { I18nProvider } from '@/i18n/useI18n';

function ProvidersInner({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = usePreferences();
  return (
    <I18nProvider language={language} setLanguage={setLanguage}>
      <GameRoundsProvider>{children}</GameRoundsProvider>
    </I18nProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <ProvidersInner>{children}</ProvidersInner>
    </PreferencesProvider>
  );
}

