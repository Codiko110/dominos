import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/context/GameRoundsContext';
import { useI18n } from '@/i18n/useI18n';
import { AppButton } from '@/components/ui/AppButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { usePreferences } from '@/context/PreferencesContext';
import { ProgressBar } from '@/components/ui/ProgressBar';

function formatWinners(names: string[]) {
  if (names.length <= 1) return names[0] ?? '';
  return names.join(', ');
}

export default function ResultScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { themeColors } = usePreferences();
  const { game, replay } = useGame();

  const ranking = useMemo(() => {
    if (!game) return [];
    return [...game.players].sort((a, b) => b.score - a.score);
  }, [game]);

  const winnerNames = useMemo(() => {
    if (!game) return [];
    const winnerIds = game.winnerPlayerIds ?? [];
    const map = new Map(game.players.map((p) => [p.id, p.name]));
    return winnerIds.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [game]);

  if (!game) {
    return (
      <ScreenContainer style={styles.centered}>
        <Text style={{ color: themeColors.text, fontWeight: '900' }}>{t('result')}</Text>
      </ScreenContainer>
    );
  }

  const isSingleWinner = winnerNames.length <= 1;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: themeColors.text }]}>
            {isSingleWinner ? t('winner') : t('winners')}
          </Text>
          <Text style={[styles.heroWinner, { color: themeColors.primary }]}>{formatWinners(winnerNames)}</Text>
          <Text style={{ color: themeColors.mutedText, fontWeight: '800', marginTop: 6 }}>
            {t('finalScore')}: {game.targetScore}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('ranking')}</Text>
          {ranking.map((p, idx) => (
            <View key={p.id} style={[styles.rankRow, { borderColor: themeColors.border }]}>
              <View style={styles.rankLeft}>
                <View style={[styles.rankDot, { backgroundColor: p.color }]} />
                <Text style={[styles.rankName, { color: themeColors.text }]}>
                  #{idx + 1} {p.name}
                </Text>
              </View>
              <View style={styles.rankRight}>
                <Text style={[styles.rankScore, { color: themeColors.text }]}>{p.score}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.progressSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('progress')}</Text>
          {ranking.map((p) => (
            <View key={`pb_${p.id}`} style={styles.pbRow}>
              <View style={styles.pbTopRow}>
                <View style={[styles.rankDot, { backgroundColor: p.color }]} />
                <Text style={[styles.rankName, { color: themeColors.text }]}>{p.name}</Text>
              </View>
              <ProgressBar value={p.score} max={game.targetScore} />
            </View>
          ))}
        </View>

        <View style={styles.ctaWrap}>
          <AppButton
            title={t('replay')}
            onPress={async () => {
              await replay();
              router.replace('/game' as any);
            }}
          />
          <View style={{ height: 12 }} />
          <AppButton title={t('backHome')} variant="secondary" onPress={() => router.replace('/')} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    padding: 16,
    gap: 18,
  },
  hero: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  heroWinner: {
    fontSize: 28,
    fontWeight: '900',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  rankRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '900',
  },
  rankRight: {},
  rankScore: {
    fontSize: 18,
    fontWeight: '900',
  },
  progressSection: {
    gap: 10,
  },
  pbRow: {
    gap: 8,
    paddingVertical: 8,
  },
  pbTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaWrap: {
    marginTop: 8,
  },
});

