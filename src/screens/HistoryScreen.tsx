import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '@/i18n/useI18n';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useGame, type GameHistoryItem } from '@/context/GameRoundsContext';
import { usePreferences } from '@/context/PreferencesContext';
import { formatDateTime } from '@/utils/date';
import { AppButton } from '@/components/ui/AppButton';

function computeWinnerNames(item: GameHistoryItem): string[] {
  const map = new Map(item.players.map((p) => [p.id, p.name]));
  return item.winnerPlayerIds.map((id) => map.get(id)).filter(Boolean) as string[];
}

function formatTimeOnly(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function playersCountLabel(count: number, locale: string) {
  if (locale.startsWith('fr')) {
    return `${count} ${count > 1 ? 'Joueurs' : 'Joueur'}`;
  }
  return `${count} ${count > 1 ? 'Players' : 'Player'}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function HistoryScreen() {
  const { t, language } = useI18n();
  const { themeColors } = usePreferences();
  const { history, clearHistory, deleteHistoryItem, getHistoryItem } = useGame();
  const { width } = useWindowDimensions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = selectedId ? getHistoryItem(selectedId) : undefined;

  const locale = language === 'en' ? 'en-US' : 'fr-FR';
  const hasHistory = history.length > 0;

  const pad = clamp(width * 0.04, 12, 18);
  const titleSize = clamp(width * 0.072, 22, 28);
  const cardRadius = clamp(width * 0.07, 18, 28);
  const dotSize = clamp(width * 0.11, 36, 46);
  const playersCountSize = clamp(width * 0.045, 14, 18);
  const finalScoreSize = clamp(width * 0.048, 15, 18);
  const winnerSize = clamp(width * 0.045, 14, 18);

  const list = (
    <ScrollView contentContainerStyle={[styles.content, { padding: pad }]} showsVerticalScrollIndicator={false}>
      <View style={styles.bgLayer} pointerEvents="none">
        <View style={[styles.glow, styles.glowBlue]} />
        <View style={[styles.glow, styles.glowRed]} />
        <View style={[styles.glow, styles.glowGreen]} />
        <View style={[styles.glow, styles.glowGold]} />
      </View>

      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: themeColors.text, fontSize: titleSize, lineHeight: titleSize + 3 }]}>
          {t('gameHistory')}
        </Text>
        <Pressable
          disabled={!hasHistory}
          onPress={() => {
            Alert.alert(t('deleteAll'), t('deleteAll'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('ok'), style: 'destructive', onPress: () => clearHistory() },
            ]);
          }}
          style={({ pressed }) => [
            styles.deleteAllBtn,
            {
              opacity: !hasHistory ? 0.45 : pressed ? 0.82 : 1,
              paddingHorizontal: clamp(width * 0.03, 10, 14),
              paddingVertical: clamp(width * 0.022, 8, 10),
            },
          ]}>
          <Ionicons name="trash" size={clamp(width * 0.046, 16, 20)} color="#EF4444" />
          <Text style={[styles.deleteAllLabel, { fontSize: clamp(width * 0.036, 12, 14) }]}>{t('deleteAll')}</Text>
        </Pressable>
      </View>

      {history.map((item) => {
        const winnerNames = computeWinnerNames(item);
        const winnerColor =
          winnerNames.length === 1
            ? item.players.find((p) => p.name === winnerNames[0])?.color ?? '#64748B'
            : '#64748B';

        return (
          <Pressable
            key={item.id}
            onPress={() => setSelectedId(item.id)}
            style={({ pressed }) => [
              styles.card,
              {
                opacity: pressed ? 0.84 : 1,
                borderRadius: cardRadius,
                padding: clamp(width * 0.036, 12, 16),
              },
            ]}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.playersDotsWrap}>
                {item.players.map((p) => (
                  <View
                    key={`${item.id}_${p.id}`}
                    style={[styles.playerDot, { backgroundColor: p.color, width: dotSize, height: dotSize, borderRadius: dotSize / 2 }]}
                  >
                    <Ionicons name="person" size={Math.floor(dotSize * 0.44)} color="rgba(255,255,255,0.76)" />
                  </View>
                ))}
              </View>

              <View style={styles.metaWrap}>
                <Text style={[styles.playersCount, { color: themeColors.text, fontSize: playersCountSize }]}> 
                  {playersCountLabel(item.players.length, locale)}
                </Text>
                <Text style={[styles.timeText, { color: themeColors.mutedText, fontSize: clamp(width * 0.038, 12, 14) }]}> 
                  {formatTimeOnly(item.createdAtISO, locale)}
                </Text>
              </View>
            </View>

            <View style={styles.cardBottomRow}>
              <View style={[styles.finalScorePill, { borderRadius: clamp(width * 0.038, 12, 16) }]}> 
                <Text style={[styles.finalScoreText, { fontSize: finalScoreSize }]}> 
                  {t('finalScore')}: {item.targetScore}
                </Text>
              </View>
              <View
                style={[
                  styles.winnerPill,
                  {
                    backgroundColor: winnerColor,
                    borderRadius: clamp(width * 0.038, 12, 16),
                    minWidth: clamp(width * 0.28, 105, 140),
                  },
                ]}
              >
                <Text numberOfLines={1} style={[styles.winnerPillText, { fontSize: winnerSize }]}> 
                  {winnerNames.join(', ') || '-'}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      {!hasHistory ? (
        <View style={styles.empty}>
          <Text style={{ color: themeColors.mutedText, fontWeight: '800' }}>{t('gameHistory')}</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  const details = selectedItem ? (
    <ScrollView contentContainerStyle={[styles.content, { padding: pad }]} showsVerticalScrollIndicator={false}>
      <View style={styles.backRow}>
        <AppButton title={t('backHome')} variant="secondary" onPress={() => setSelectedId(null)} />
        <View style={{ width: 10 }} />
        <AppButton
          title={t('delete')}
          variant="danger"
          onPress={() => {
            Alert.alert(t('delete'), t('delete'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('ok'), style: 'destructive', onPress: () => deleteHistoryItem(selectedItem.id) },
            ]);
          }}
        />
      </View>

      <View style={styles.detailHero}>
        <Text style={[styles.detailTitle, { color: themeColors.text }]}>{t('details')}</Text>
        <Text style={{ color: themeColors.mutedText, fontWeight: '900' }}>
          {formatDateTime(selectedItem.createdAtISO, locale)}
        </Text>
        <Text style={{ color: themeColors.text, fontWeight: '900', marginTop: 10 }}>
          {computeWinnerNames(selectedItem).join(', ')}
        </Text>
        <Text style={{ color: themeColors.mutedText, fontWeight: '900', marginTop: 6 }}>
          {t('finalScore')}: {selectedItem.targetScore}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('ranking')}</Text>
        {selectedItem.players
          .slice()
          .sort((a, b) => (selectedItem.finalScoresByPlayerId[b.id] ?? 0) - (selectedItem.finalScoresByPlayerId[a.id] ?? 0))
          .map((p, idx) => {
            const finalScore = selectedItem.finalScoresByPlayerId[p.id] ?? 0;
            return (
              <View key={`d_rank_${p.id}`} style={[styles.rankRow, { borderColor: themeColors.border }]}>
                <View style={styles.rankLeft}>
                  <View style={[styles.rankDot, { backgroundColor: p.color }]} />
                  <Text style={[styles.rankName, { color: themeColors.text }]}>
                    {idx + 1}. {p.name}
                  </Text>
                </View>
                <Text style={{ color: themeColors.text, fontWeight: '900' }}>{finalScore}</Text>
              </View>
            );
          })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('rounds')}</Text>
        <View style={styles.timeline}>
          {selectedItem.rounds.map((round, idx) => (
            <View key={round.id} style={[styles.timelineEntry, { borderColor: themeColors.border }]}> 
              <Text style={{ color: themeColors.text, fontWeight: '900' }}>
                {idx + 1}. {t('round')}
              </Text>
              <Text style={{ color: themeColors.mutedText, fontWeight: '800', marginTop: 4 }}>
                {formatDateTime(round.atISO, locale)}
              </Text>
              <View style={styles.scoreGrid}>
                {selectedItem.players.map((p) => {
                  const scoreForRound = round.scoresByPlayerId[p.id] ?? 0;
                  return (
                    <View key={`score_${round.id}_${p.id}`} style={styles.scoreCell}>
                      <View style={[styles.rankDot, { backgroundColor: p.color, width: 10, height: 10 }]} />
                      <Text style={{ color: themeColors.text, fontWeight: '900' }}>
                        {p.name}: {scoreForRound}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  ) : null;

  return <ScreenContainer>{selectedId && selectedItem ? details : list}</ScreenContainer>;
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 999,
    opacity: 0.2,
  },
  glowBlue: {
    right: -70,
    top: 120,
    backgroundColor: '#3B82F6',
  },
  glowRed: {
    left: -90,
    top: 200,
    backgroundColor: '#F43F5E',
  },
  glowGreen: {
    left: -70,
    bottom: 250,
    backgroundColor: '#22C55E',
  },
  glowGold: {
    right: -80,
    bottom: 120,
    backgroundColor: '#F59E0B',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontWeight: '900',
    letterSpacing: -0.6,
    flex: 1,
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    marginTop: 4,
  },
  deleteAllLabel: {
    color: '#EF4444',
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.42)',
    gap: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.44)',
    marginTop: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  playersDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  playerDot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  playersCount: {
    fontWeight: '900',
  },
  timeText: {
    fontWeight: '700',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finalScorePill: {
    flex: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.42)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  finalScoreText: {
    color: '#E5E7EB',
    fontWeight: '900',
  },
  winnerPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerPillText: {
    color: '#FFF',
    fontWeight: '900',
  },
  empty: {
    marginTop: 26,
    alignItems: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  detailHero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: 'rgba(30,41,59,0.32)',
    gap: 6,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  section: {
    gap: 10,
    marginTop: 10,
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
    backgroundColor: 'rgba(30,41,59,0.25)',
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
    fontSize: 15,
    fontWeight: '900',
  },
  timeline: {
    gap: 12,
    marginTop: 8,
  },
  timelineEntry: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    backgroundColor: 'rgba(30,41,59,0.25)',
  },
  scoreGrid: {
    marginTop: 8,
    gap: 8,
  },
  scoreCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
