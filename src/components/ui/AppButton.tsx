import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { usePreferences } from '@/context/PreferencesContext';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { themeColors } = usePreferences();

  const variantStyles: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: themeColors.primary, fg: '#FFFFFF' },
    secondary: { bg: themeColors.card, fg: themeColors.text, border: themeColors.border },
    danger: { bg: '#DC2626', fg: '#FFFFFF' },
  };

  const vs = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: disabled ? 'rgba(127,127,127,0.35)' : vs.bg,
          borderColor: vs.border ?? 'transparent',
          opacity: pressed && !disabled ? 0.9 : 1,
        },
        style,
      ]}>
      <View>
        <Text style={[styles.text, { color: disabled ? 'rgba(255,255,255,0.8)' : vs.fg }, textStyle]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});

