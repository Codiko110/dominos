import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/useI18n';
import { usePreferences } from '@/context/PreferencesContext';

export default function ModalScreen() {
  const { t } = useI18n();
  const { themeColors } = usePreferences();
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>{t('appName')}</Text>
      <Link href="/" style={styles.link}>
        <Text style={[styles.linkText, { color: themeColors.primary }]}>{t('backHome')}</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontWeight: '900',
  },
});
