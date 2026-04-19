import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useGame } from '@/context/GameRoundsContext';
import { usePreferences } from '@/context/PreferencesContext';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { PlayerCameraModal } from '@/components/ui/PlayerCameraModal';

export default function GameScreen() {
  const router = useRouter();
  const { themeColors } = usePreferences();
  const { game, addRoundWithScore, deleteRound, setRoundScore, replay, recordPlayerCapture } = useGame();
  const { width: windowWidth } = useWindowDimensions();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [cameraPlayerId, setCameraPlayerId] = useState<string | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  
  const inputRef = useRef<TextInput>(null);

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

  if (!game) return null;

  const objective = game.targetScore;

  // --- LOGIQUE MODAL ---
  const openAddPointsModal = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setPointsToAdd('');
    setIsModalVisible(true);
  };

  const openCamera = (playerId: string) => {
    setCameraPlayerId(playerId);
  };

  const handleConfirmPoints = async () => {
    if (selectedPlayerId) {
      const n = Number(pointsToAdd.trim());
      const safeScore = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      await addRoundWithScore(selectedPlayerId, safeScore);
      setIsModalVisible(false);
      setSelectedPlayerId(null);
    }
  };

  const onChangeCell = (roundId: string, playerId: string, raw: string) => {
    const key = `${roundId}_${playerId}`;
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    const n = Number(raw.trim());
    if (!Number.isFinite(n)) return;
    void setRoundScore(roundId, playerId, n);
  };

  const currentPlayer = game.players.find((p) => p.id === selectedPlayerId);
  const cameraPlayer = game.players.find((p) => p.id === cameraPlayerId);

  return (
    <ScreenContainer style={{ backgroundColor: themeColors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => replay()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={24} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Grille des joueurs */}
      <View style={styles.gridContainer}>
        {game.players.map((p) => (
          <View key={p.id} style={[styles.playerCol, { width: (windowWidth - 32) / 2 }]}>
            
            {/* En-tête du joueur (Carré rouge adapté) */}
            <View style={[styles.playerCard, { backgroundColor: p.color || '#990000' }]}>
              <View style={styles.cardInfo}>
                <View style={styles.playerIdentity}>
                  {p.photoUri ? <Image source={{ uri: p.photoUri }} style={styles.playerThumb} /> : null}
                  <Text style={styles.playerName} numberOfLines={1}>
                    {p.name.toLowerCase()}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => openCamera(p.id)}
                    style={({ pressed }) => [styles.cameraIcon, pressed && styles.iconPressed]}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Ouvrir la caméra pour ${p.name}`}>
                    <Ionicons name="camera-outline" size={20} color="#FFF" />
                  </Pressable>
                  <TouchableOpacity onPress={() => openAddPointsModal(p.id)} style={styles.plusIcon}>
                    <Ionicons name="add" size={28} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
              {typeof p.lastDetectedPoints === 'number' ? (
                <View style={styles.detectedBadge}>
                  <Ionicons name="scan-outline" size={12} color="#FFF" />
                  <Text style={styles.detectedBadgeText}>{p.lastDetectedPoints} pts</Text>
                </View>
              ) : null}
              <Text style={styles.cardBigScore}>{p.score}</Text>
            </View>

            {/* Liste des points avec Scroll individuel */}
            <ScrollView 
              style={styles.roundsListScroll} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {game.rounds.map((round, idx) => {
                const val = drafts[`${round.id}_${p.id}`] ?? String(round.scoresByPlayerId[p.id] ?? 0);
                return (
                  <View key={round.id} style={[styles.roundRow, { borderBottomColor: themeColors.border }]}>
                    <Text style={[styles.roundIdx, { color: themeColors.mutedText }]}>{idx + 1}</Text>
                    <TextInput
                      style={[styles.roundInput, { color: themeColors.text }]}
                      keyboardType="numeric"
                      value={val}
                      onChangeText={(txt) => onChangeCell(round.id, p.id, txt)}
                      selectTextOnFocus
                    />
                    <TouchableOpacity onPress={() => deleteRound(round.id)}>
                      <Text style={styles.deleteX}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer Score */}
            <View style={styles.footerScore}>
              <Text style={[styles.scoreTotal, { color: themeColors.text }]}>
                {p.score}
                <Text style={{ fontSize: 12, color: themeColors.mutedText }}> /{objective}</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* MODAL AJOUT POINTS */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onShow={() => inputRef.current?.focus()} // Force le focus à l'ouverture
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>{currentPlayer?.name}</Text>
            
            <TextInput
              ref={inputRef}
              style={[styles.modalInput, { backgroundColor: themeColors.background, color: themeColors.text }]}
              keyboardType="numeric"
              value={pointsToAdd}
              onChangeText={setPointsToAdd}
              placeholder="0"
              placeholderTextColor={themeColors.mutedText}
              autoFocus={true} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.cancelBtn}>
                <Text style={{ color: themeColors.mutedText }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleConfirmPoints} 
                style={[styles.confirmBtn, { backgroundColor: currentPlayer?.color || themeColors.primary }]}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {cameraPlayer ? (
        <PlayerCameraModal
          visible={!!cameraPlayer}
          playerName={cameraPlayer.name}
          playerColor={cameraPlayer.color}
          onClose={() => setCameraPlayerId(null)}
          onUsePhoto={async (photoUri) => {
            await recordPlayerCapture(cameraPlayer.id, photoUri);
            setCameraPlayerId(null);
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  refreshBtn: {
    padding: 8,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  playerCol: {
    height: '48%', // Permet d'avoir 2 rangées environ sur l'écran
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  playerCard: {
    borderRadius: 12,
    padding: 10,
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  playerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  playerThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  playerName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cameraIcon: {
    padding: 6,
    borderRadius: 999,
    marginRight: 2,
  },
  plusIcon: {
    padding: 2,
  },
  iconPressed: {
    opacity: 0.75,
  },
  detectedBadge: {
    position: 'absolute',
    left: 10,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detectedBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBigScore: {
    position: 'absolute',
    right: 5,
    bottom: -5,
    fontSize: 50,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.25)',
  },
  roundsListScroll: {
    flex: 1,
    marginTop: 8,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  roundIdx: {
    fontSize: 12,
    width: 18,
  },
  roundInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
  },
  deleteX: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'right',
  },
  footerScore: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  scoreTotal: {
    fontSize: 24,
    fontWeight: '900',
  },
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    fontSize: 32,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
  },
  cancelBtn: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 2,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
});
