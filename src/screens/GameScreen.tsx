import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useGame } from '@/context/GameRoundsContext';
import { useI18n } from '@/i18n/useI18n';
import { usePreferences } from '@/context/PreferencesContext';
import { AppButton } from '@/components/ui/AppButton';
import { CameraPlaceholderButton } from '@/components/ui/CameraPlaceholderButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function GameScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { themeColors } = usePreferences();
  const { game, addRound, addRoundWithScore, deleteRound, setRoundScore, replay } = useGame();
  const { width: windowWidth } = useWindowDimensions();

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const roundsSignature = useMemo(() => {
    return game ? game.rounds.map((r) => r.id).join('|') : '';
  }, [game]);

  useEffect(() => {
    setDrafts({});
  }, [roundsSignature]);

  useEffect(() => {
    if (game?.status === 'finished') {
      router.replace('/result' as any);
    }
  }, [game?.status, router]);

  if (!game) {
    return (
      <ScreenContainer style={styles.centered}>
        <Text style={{ color: themeColors.text, fontWeight: '900', fontSize: 16 }}>{t('game')}</Text>
        <Text style={{ color: themeColors.mutedText, marginTop: 10 }}>{t('backHome')}</Text>
      </ScreenContainer>
    );
  }

  const objective = game.targetScore;
  const isFinished = game.status === 'finished';

  const numPlayers = game.players.length;
  const roundColWidth = 56;
  const playerColWidth = Math.max(92, Math.floor((windowWidth - 48 - roundColWidth) / Math.max(1, numPlayers)));
  const tableMinWidth = roundColWidth + playerColWidth * numPlayers;
  const shouldScrollX = tableMinWidth > windowWidth - 32;

  const getKey = (roundId: string, playerId: string) => `${roundId}_${playerId}`;

  const onChangeCell = (roundId: string, playerId: string, raw: string) => {
    const key = getKey(roundId, playerId);
    setDrafts((prev) => ({ ...prev, [key]: raw }));

    const trimmed = raw.trim();
    if (trimmed === '') {
      void setRoundScore(roundId, playerId, 0);
      return;
    }

    const n = Number(trimmed);
    if (!Number.isFinite(n)) return;
    void setRoundScore(roundId, playerId, n);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('game')}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={isFinished}
            onPress={async () => {
              await replay();
            }}
            style={[styles.refreshBtn, { borderColor: themeColors.border, opacity: isFinished ? 0.5 : 1 }]}>
            <Ionicons name="refresh-outline" size={20} color={themeColors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerSub, { color: themeColors.mutedText }]}>
          {t('targetScore')} :{' '}
          <Text style={{ color: themeColors.text, fontWeight: '900' }}>{objective}</Text>
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isFinished}>
        <ScrollView horizontal={shouldScrollX} showsHorizontalScrollIndicator={false}>
          <View style={[styles.table, { minWidth: tableMinWidth }]}>
            <View style={styles.tableHeaderRow}>
              <View style={[styles.colRound, { width: roundColWidth }]}>
                <Text style={[styles.th, { color: themeColors.mutedText }]}>{t('round')}</Text>
              </View>

              {game.players.map((p) => (
                <View key={p.id} style={[styles.colPlayer, { width: playerColWidth }]}>
                  <View style={[styles.playerHeader, { borderColor: p.color, backgroundColor: `${p.color}10` }]}>
                    <View style={styles.playerHeaderTopRow}>
                      <CameraPlaceholderButton color={p.color} />
                      <TouchableOpacity
                        accessibilityRole="button"
                        disabled={isFinished}
                        onPress={() => {
                          void addRoundWithScore(p.id, 1);
                        }}
                        style={[styles.plusBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
                        <Ionicons name="add" size={18} color={themeColors.primary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.thPlayer, { color: themeColors.text }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[styles.totalInHeader, { color: themeColors.text }]}>
                      {p.score} / {objective}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {game.rounds.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ color: themeColors.mutedText, fontWeight: '900' }}>{t('emptyRounds')}</Text>
              </View>
            ) : null}

            {game.rounds.map((round, roundIdx) => (
              <View key={round.id} style={styles.row}>
                <View style={[styles.colRound, { width: roundColWidth }]}>
                  <View style={styles.roundTop}>
                    <Text style={{ color: themeColors.text, fontWeight: '900' }}>{roundIdx + 1}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={isFinished}
                      onPress={() => {
                        void deleteRound(round.id);
                      }}
                      style={[styles.deleteBtn, { borderColor: themeColors.border }]}>
                      <Text style={{ color: '#DC2626', fontWeight: '900' }}>❌</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {game.players.map((p) => {
                  const key = getKey(round.id, p.id);
                  const value = drafts[key] ?? String(round.scoresByPlayerId[p.id] ?? 0);
                  return (
                    <View key={p.id} style={[styles.colPlayer, { width: playerColWidth }]}>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: themeColors.background,
                            borderColor: themeColors.border,
                            color: themeColors.text,
                            opacity: isFinished ? 0.55 : 1,
                          },
                        ]}
                        keyboardType="numeric"
                        editable={!isFinished}
                        value={value}
                        onChangeText={(txt) => onChangeCell(round.id, p.id, txt)}
                        selectTextOnFocus
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.totalsWrap}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('total')}</Text>
          <View style={styles.totalsRow}>
            {game.players.map((p) => (
              <View key={p.id} style={[styles.totalCard, { borderColor: p.color }]}>
                <View style={styles.totalTop}>
                  <View style={[styles.playerDot, { backgroundColor: p.color }]} />
                  <Text style={{ color: themeColors.text, fontWeight: '900' }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
                <Text style={{ color: themeColors.text, fontWeight: '900', fontSize: 18 }}>
                  {p.score} / {objective}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.addRoundWrap}>
          <AppButton
            title={t('addRound')}
            onPress={() => {
              void addRound();
            }}
            disabled={isFinished}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  headerSub: {
    fontSize: 14,
    fontWeight: '800',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  table: {
    borderWidth: 1,
    borderRadius: 16,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  colRound: {
    paddingHorizontal: 8,
  },
  colPlayer: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  th: {
    fontWeight: '900',
    fontSize: 14,
  },
  thPlayer: {
    fontWeight: '900',
    fontSize: 14,
  },
  playerHeader: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
    alignItems: 'center',
  },
  playerHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  plusBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  empty: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  totalInHeader: {
    fontSize: 18,
    fontWeight: '900',
  },
  totalsWrap: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  totalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  totalCard: {
    minWidth: 130,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  totalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addRoundWrap: {
    marginTop: 6,
  },
});

