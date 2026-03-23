import type { ColorSchemeName } from 'react-native';

export type AppTheme = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  border: string;
  primary: string;
};

const light: ThemeColors = {
  background: '#FFFFFF',
  card: '#F6F7F9',
  text: '#0B1220',
  mutedText: '#5B6575',
  border: '#E5E7EB',
  primary: '#0A7EA4',
};

const dark: ThemeColors = {
  background: '#0B1220',
  card: '#111A2E',
  text: '#E8EEF6',
  mutedText: '#A6B1C2',
  border: '#24324F',
  primary: '#2DC0E6',
};

export function getThemeColors(theme: AppTheme): ThemeColors {
  return theme === 'dark' ? dark : light;
}

export function normalizeTheme(value: ColorSchemeName | AppTheme | undefined | null): AppTheme {
  if (value === 'dark') return 'dark';
  return 'light';
}

export const playerPalette = [
  '#FF6B6B',
  '#4D96FF',
  '#6BCB77',
  '#FFD93D',
  '#B892FF',
  '#34D399',
] as const;

