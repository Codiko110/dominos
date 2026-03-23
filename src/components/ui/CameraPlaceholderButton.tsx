import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '@/context/PreferencesContext';

export function CameraPlaceholderButton({ color }: { color: string }) {
  const { themeColors } = usePreferences();
  return (
    <Pressable
      onPress={() => {
        // Placeholder only: no scan / no camera logic for now (per requirements).
      }}
      style={({ pressed }) => [
        styles.wrap,
        {
          borderColor: color,
          opacity: pressed ? 0.8 : 1,
          backgroundColor: `${color}22`,
        },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: color }]} />
      <Ionicons name="camera-outline" size={18} color={themeColors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
  },
  iconWrap: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});

