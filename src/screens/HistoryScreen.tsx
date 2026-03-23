import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

export default function HistoryScreen() {
  const { t, language } = useI18n();
  const { themeColors } = usePreferences();
  const { history, clearHistory, deleteHistoryItem, getHistoryItem } = useGame();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = selectedId ? getHistoryItem(selectedId) : undefined;

  const locale = language === 'en' ? 'en-US' : 'fr-FR';

  const hasHistory = history.length > 0;

  const list = (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: themeColors.text }]}>{t('gameHistory')}</Text>
        <AppButton
          title={t('deleteAll')}
          variant="danger"
          disabled={!hasHistory}
          onPress={() => {
            Alert.alert(t('deleteAll'), t('deleteAll'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('ok'), style: 'destructive', onPress: () => clearHistory() },
            ]);
          }}
        />
      </View>

      {history.map((item) => {
        const winnerNames = computeWinnerNames(item);
        const playersLabel = item.players.map((p) => p.name).join(', ');
        return (
          <Pressable
            key={item.id}
            onPress={() => setSelectedId(item.id)}
            style={({ pressed }) => [styles.card, { borderColor: themeColors.border, opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.cardRow}>
              <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={2}>
                {playersLabel}
              </Text>
              <Text style={{ color: themeColors.mutedText, fontWeight: '900' }}>{t('finalScore')}: {item.targetScore}</Text>
            </View>
            <Text style={{ color: themeColors.mutedText, fontWeight: '800', marginTop: 6 }}>
              {formatDateTime(item.createdAtISO, locale)}
            </Text>
            <Text style={{ color: themeColors.text, fontWeight: '900', marginTop: 8 }}>
              {winnerNames.join(', ')}
            </Text>
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
    <ScrollView contentContainerStyle={styles.content}>
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
        <Text style={[styles.title, { color: themeColors.text }]}>{t('details')}</Text>
        <Text style={{ color: themeColors.mutedText, fontWeight: '900' }}>{formatDateTime(selectedItem.createdAtISO, locale)}</Text>
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
                <Text style={[styles.rankName, { color: themeColors.text }]}>{idx + 1}. {p.name}</Text>
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
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 4,
    marginTop: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  empty: {
    marginTop: 22,
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
    borderRadius: 16,
    padding: 14,
    borderColor: 'rgba(0,0,0,0.1)',
    gap: 6,
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

