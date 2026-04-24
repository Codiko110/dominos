import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n/useI18n';
import { usePreferences } from '@/context/PreferencesContext';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function SettingsScreen() {
  const { t, language } = useI18n();
  const { themeColors, theme, setTheme, setLanguage } = usePreferences();

  return (
    <ScreenContainer disableThemeBackgroundImage>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('theme')}</Text>
          <View style={styles.row}>
            <AppButton
              title={t('light')}
              variant={theme === 'light' ? 'primary' : 'secondary'}
              onPress={() => setTheme('light')}
            />
            <View style={{ width: 12 }} />
            <AppButton
              title={t('dark')}
              variant={theme === 'dark' ? 'primary' : 'secondary'}
              onPress={() => setTheme('dark')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.title, { color: themeColors.text }]}>{t('language')}</Text>
          <View style={styles.row}>
            <AppButton
              title={t('french')}
              variant={language === 'fr' ? 'primary' : 'secondary'}
              onPress={() => setLanguage('fr')}
            />
            <View style={{ width: 12 }} />
            <AppButton
              title={t('english')}
              variant={language === 'en' ? 'primary' : 'secondary'}
              onPress={() => setLanguage('en')}
            />
          </View>
        </View>

        <View style={styles.help}>
          <Text style={{ color: themeColors.mutedText, fontWeight: '800' }}>
            {t('settingsOfflineHelp')}
          </Text>
        </View>

        <View style={{ height: 22 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  help: {
    marginTop: 6,
    paddingHorizontal: 6,
  },
});
