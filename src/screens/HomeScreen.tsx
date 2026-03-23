import React, { useMemo, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Import de l'icône

import { useGame } from '@/context/GameRoundsContext';
import { useI18n } from '@/i18n/useI18n';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { usePreferences } from '@/context/PreferencesContext';

function SegmentedPlayers({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const { themeColors } = usePreferences();
  return (
    <View style={styles.segmentedRow}>
      {[2, 3, 4].map((n) => {
        const isActive = n === value;
        return (
          <TouchableWithoutFeedback key={n} onPress={() => onChange(n)}>
            <View
              style={[
                styles.segmentedItem,
                {
                  backgroundColor: isActive ? themeColors.primary : themeColors.card,
                  borderColor: isActive ? themeColors.primary : themeColors.border,
                },
              ]}>
              <Text style={[styles.segmentedText, { color: isActive ? '#fff' : themeColors.text }]}>{n}</Text>
            </View>
          </TouchableWithoutFeedback>
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, language } = useI18n();
  const { startNewGame, ready } = useGame();
  const { themeColors } = usePreferences();

  const [numPlayers, setNumPlayers] = useState(2);
  const [playerNames, setPlayerNames] = useState<(string | null)[]>(['', '']);
  const [targetScore, setTargetScore] = useState<number>(100);
  const [manualTarget, setManualTarget] = useState<string>('100');

  const safePlayerNames = useMemo(() => {
    return Array.from({ length: numPlayers }).map((_, idx) => playerNames[idx] ?? '');
  }, [numPlayers, playerNames]);

  const autoName = (idx: number) => {
    return language === 'en' ? `Player ${idx + 1}` : `Joueur ${idx + 1}`;
  };

  const computedPlayerNames = useMemo(() => {
    return safePlayerNames.map((name, idx) => {
      const trimmed = (name ?? '').toString().trim();
      return trimmed.length > 0 ? trimmed : autoName(idx);
    });
  }, [safePlayerNames, language]);

  const parsedManualTarget = useMemo(() => {
    const n = Number(manualTarget);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }, [manualTarget]);

  const isManualTargetValid = parsedManualTarget !== null;

  const onPressStart = async () => {
    if (!ready) return;
    const finalTarget = isManualTargetValid ? parsedManualTarget! : targetScore;
    await startNewGame({
      numPlayers,
      playerNames: computedPlayerNames,
      targetScore: finalTarget,
    });
    router.push('/game' as any);
  };

  return (
    <ScreenContainer style={styles.content}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: themeColors.text }]}>{t('partConfigTitle')}</Text>

          {/* NOMBRE DE JOUEURS */}
          <View style={styles.block}>
            <Text style={[styles.label, { color: themeColors.mutedText }]}>{t('numberOfPlayers')}</Text>
            <SegmentedPlayers value={numPlayers} onChange={(n) => setNumPlayers(n)} />
          </View>

          {/* NOMS DES JOUEURS */}
          <View style={styles.block}>
            <Text style={[styles.label, { color: themeColors.mutedText }]}>
              {t('playerName')} {t('emptyAutoFill')}
            </Text>
            {Array.from({ length: numPlayers }).map((_, idx) => (
              <View key={idx} style={styles.nameRow}>
                <Text style={[styles.nameIndex, { color: themeColors.mutedText }]}>#{idx + 1}</Text>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: themeColors.card, color: themeColors.text, borderColor: themeColors.border }]}
                  value={playerNames[idx] ?? ''}
                  onChangeText={(txt) => {
                    setPlayerNames((prev) => {
                      const next = [...prev];
                      next[idx] = txt;
                      return next;
                    });
                  }}
                  placeholder={autoName(idx)}
                  placeholderTextColor={themeColors.mutedText}
                  autoCapitalize="words"
                />
              </View>
            ))}
          </View>

          {/* SCORE CIBLE */}
          <View style={styles.block}>
            <Text style={[styles.label, { color: themeColors.mutedText }]}>{t('targetScore')}</Text>

            <View style={styles.scoreButtonsRow}>
              {[100, 120, 200].map((v) => {
                const isActive = parsedManualTarget === v;
                return (
                  <TouchableWithoutFeedback
                    key={v}
                    onPress={() => {
                      setTargetScore(v);
                      setManualTarget(String(v));
                    }}>
                    <View
                      style={[
                        styles.scoreButton,
                        {
                          backgroundColor: isActive ? themeColors.primary : themeColors.card,
                          borderColor: isActive ? themeColors.primary : themeColors.border,
                        },
                      ]}>
                      <Text style={{ color: isActive ? '#fff' : themeColors.text, fontWeight: '800' }}>{v}</Text>
                    </View>
                  </TouchableWithoutFeedback>
                );
              })}
            </View>

            {/* INPUT MANUEL AVEC ICÔNE CRAYON */}
            <View style={[styles.manualInputWrapper, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <TextInput
                style={[styles.manualInput, { color: themeColors.text }]}
                keyboardType="numeric"
                value={manualTarget}
                onChangeText={(txt) => setManualTarget(txt)}
                placeholder="Score personnalisé"
                placeholderTextColor={themeColors.mutedText}
              />
              <Ionicons name="pencil" size={18} color={themeColors.primary} style={styles.pencilIcon} />
            </View>
          </View>

          <View style={styles.ctaRow}>
            <AppButton 
                title={t('startGame')} 
                onPress={onPressStart} 
                disabled={!ready || !isManualTargetValid} 
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  inner: { padding: 16, gap: 18 },
  title: { fontSize: 26, fontWeight: '900' },
  block: { gap: 10 },
  label: { fontSize: 14, fontWeight: '700' },
  segmentedRow: { flexDirection: 'row', gap: 10 },
  segmentedItem: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segmentedText: { fontSize: 16, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  nameIndex: { width: 32, textAlign: 'center', fontWeight: '800' },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, fontWeight: '700' },
  scoreButtonsRow: { flexDirection: 'row', gap: 10 },
  scoreButton: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Nouveaux styles pour le champ manuel épuré
  manualInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  manualInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    height: '100%',
  },
  pencilIcon: {
    marginLeft: 8,
    opacity: 0.8,
  },
  
  ctaRow: { marginTop: 10 },
});