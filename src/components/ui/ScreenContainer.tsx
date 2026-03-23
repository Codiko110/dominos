import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { usePreferences } from '@/context/PreferencesContext';

export function ScreenContainer({ style, ...props }: ViewProps) {
  const { themeColors } = usePreferences();
  return <View style={[styles.container, { backgroundColor: themeColors.background }, style]} {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

