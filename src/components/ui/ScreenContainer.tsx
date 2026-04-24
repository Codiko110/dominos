import React from 'react';
import { ImageBackground, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreferences } from '@/context/PreferencesContext';

type ScreenContainerProps = ViewProps & {
  disableThemeBackgroundImage?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BG_LIGHT = require('../../../assets/images/fond_white.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BG_DARK = require('../../../assets/images/fond_black.png');

export function ScreenContainer({
  style,
  disableThemeBackgroundImage = false,
  children,
  ...restProps
}: ScreenContainerProps) {
  const { themeColors, theme } = usePreferences();
  const insets = useSafeAreaInsets();
  const containerStyle = [styles.container, { paddingTop: insets.top + 6 }, style];

  if (disableThemeBackgroundImage) {
    return (
      <View style={[...containerStyle, { backgroundColor: themeColors.background }]} {...restProps}>
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      source={theme === 'dark' ? BG_DARK : BG_LIGHT}
      style={containerStyle}
      resizeMode="cover"
      blurRadius={5}
      {...restProps}
    >
      <View
        pointerEvents="none"
        style={[
          styles.scrim,
          {
            backgroundColor:
              theme === 'dark' ? 'rgba(2, 6, 23, 0.34)' : 'rgba(248, 250, 252, 0.24)',
          },
        ]}
      />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
});
