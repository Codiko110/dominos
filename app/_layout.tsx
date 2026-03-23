import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { usePreferences } from '@/context/PreferencesContext';
import { AppProviders } from '@/context/AppProviders';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootStack() {
  const { theme } = usePreferences();
  const barStyle = theme === 'dark' ? ('light' as const) : ('dark' as const);

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="game" options={{ headerShown: false }} />
        <Stack.Screen name="result" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={barStyle as 'light' | 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}
