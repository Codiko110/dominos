import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/context/GameRoundsContext';
import { useI18n } from '@/i18n/useI18n';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { usePreferences } from '@/context/PreferencesContext';

function formatWinners(names: string[]) {
  if (names.length <= 1) return names[0] ?? '';
  return names.join(', ');
}

function medalForRank(index: number) {
  if (index === 0) return '👑';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return '🎖️';
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WINNER_IMAGE = require('../../assets/images/image_wine.png');

export default function ResultScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { themeColors } = usePreferences();
  const { game, replay } = useGame();
  const { width, height } = useWindowDimensions();

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
  const champion = ranking[0];

  const pad = clamp(width * 0.045, 12, 20);
  const titleSize = clamp(width * 0.075, 22, 28);
  const heroImageHeight = clamp(height * 0.2, 120, 200);
  const winnerSize = clamp(width * 0.058, 18, 24);
  const scoreSize = clamp(width * 0.05, 16, 20);
  const sectionTitleSize = clamp(width * 0.06, 18, 24);
  const rowNameSize = clamp(width * 0.048, 15, 18);
  const rowScoreSize = clamp(width * 0.055, 17, 22);
  const ctaHeight = clamp(height * 0.085, 56, 76);
  const ctaSize = clamp(width * 0.06, 18, 24);
  const bottomCtaSize = clamp(width * 0.052, 16, 20);

  return (
    <ScreenContainer>
      <View style={[styles.content, { padding: pad }]}> 
        <View style={styles.bgLayer} pointerEvents="none">
          <View style={[styles.glow, styles.glowGold]} />
          <View style={[styles.glow, styles.glowBlue]} />
        </View>

        <Text style={[styles.pageTitle, { color: themeColors.text, fontSize: titleSize, lineHeight: titleSize + 2 }]}> 
          {isSingleWinner ? t('winner') : t('winners')}
        </Text>

        <View style={[styles.heroCard, { padding: clamp(width * 0.03, 10, 16) }]}> 
          <Image source={WINNER_IMAGE} resizeMode="contain" style={[styles.heroImage, { height: heroImageHeight }]} />
          <Text
            numberOfLines={2}
            style={[styles.heroWinner, { color: champion?.color ?? '#22C55E', fontSize: winnerSize, lineHeight: winnerSize + 1 }]}
          >
            {formatWinners(winnerNames)}
          </Text>
          <Text style={[styles.heroScore, { fontSize: scoreSize, lineHeight: scoreSize + 1 }]}> 
            {t('finalScore')}: {game.targetScore}
          </Text>
        </View>

        <View style={[styles.rankSection, { padding: clamp(width * 0.03, 10, 14) }]}> 
          <Text style={[styles.rankTitle, { color: themeColors.text, fontSize: sectionTitleSize, lineHeight: sectionTitleSize + 1 }]}> 
            {t('ranking')}
          </Text>
          <View style={styles.rankList}>
            {ranking.map((p, idx) => (
              <View key={p.id} style={styles.rankRow}>
                <View style={styles.rankLeft}>
                  <Text style={[styles.rankIndex, { fontSize: clamp(width * 0.036, 12, 16) }]}>#{idx + 1}</Text>
                  <Text style={[styles.rankMedal, { fontSize: clamp(width * 0.044, 14, 20) }]}>{medalForRank(idx)}</Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.rankName,
                      {
                        color: idx === 0 ? p.color : themeColors.text,
                        fontSize: rowNameSize,
                        lineHeight: rowNameSize + 1,
                      },
                    ]}
                  >
                    {p.name}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rankScore,
                    {
                      color: idx === 0 ? p.color : themeColors.text,
                      fontSize: rowScoreSize,
                      lineHeight: rowScoreSize + 1,
                    },
                  ]}
                >
                  {p.score}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ctaWrap}>
          <Pressable
            onPress={async () => {
              await replay();
              router.replace('/game' as any);
            }}
            style={({ pressed }) => [
              styles.primaryCta,
              {
                height: ctaHeight,
                opacity: pressed ? 0.84 : 1,
                backgroundColor: themeColors.primary,
                borderColor: themeColors.primary,
              },
            ]}
          >
            <Text style={[styles.primaryCtaText, { fontSize: ctaSize, lineHeight: ctaSize + 1 }]}>{t('replay')} ↻</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.secondaryCta, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={[styles.secondaryCtaText, { fontSize: bottomCtaSize, lineHeight: bottomCtaSize + 1 }]}>{t('backHome')}</Text>
          </Pressable>
        </View>
      </View>
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
    flex: 1,
    gap: 10,
    justifyContent: 'space-between',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    opacity: 0.18,
  },
  glowGold: {
    right: -70,
    top: 100,
    backgroundColor: '#F59E0B',
  },
  glowBlue: {
    left: -90,
    bottom: 90,
    backgroundColor: '#1D4ED8',
  },
  pageTitle: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.7,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 204, 21, 0.65)',
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    alignItems: 'center',
    shadowColor: '#FACC15',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  heroImage: {
    width: '100%',
    borderRadius: 14,
    marginBottom: 8,
  },
  heroWinner: {
    fontWeight: '900',
    textAlign: 'center',
  },
  heroScore: {
    color: '#EADFBF',
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },
  rankSection: {
    borderRadius: 16,
    backgroundColor: 'rgba(2, 6, 23, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    gap: 4,
  },
  rankTitle: {
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 2,
  },
  rankList: {
    gap: 0,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.3)',
    paddingVertical: 4,
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  rankIndex: {
    color: '#E5E7EB',
    fontWeight: '900',
    minWidth: 30,
  },
  rankMedal: {
    width: 26,
  },
  rankName: {
    fontWeight: '900',
    flexShrink: 1,
  },
  rankScore: {
    fontWeight: '900',
    paddingLeft: 8,
  },
  ctaWrap: {
    gap: 8,
  },
  primaryCta: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.46)',
    backgroundColor: 'rgba(30, 41, 59, 0.56)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    color: '#F8FAFC',
    fontWeight: '900',
  },
  secondaryCta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  secondaryCtaText: {
    color: '#F3EAD2',
    fontWeight: '900',
  },
});
