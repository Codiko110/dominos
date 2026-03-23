import React from 'react';
import { StyleSheet, View } from 'react-native';
import { usePreferences } from '@/context/PreferencesContext';

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const { themeColors } = usePreferences();
  const safeMax = max <= 0 ? 1 : max;
  const clamped = Math.max(0, Math.min(1, value / safeMax));

  return (
    <View style={[styles.track, { backgroundColor: themeColors.border }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: themeColors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: 10,
    borderRadius: 999,
  },
});

