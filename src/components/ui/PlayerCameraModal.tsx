import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { usePreferences } from '@/context/PreferencesContext';

type PlayerCameraModalProps = {
  visible: boolean;
  playerName: string;
  playerColor: string;
  onClose: () => void;
  onUsePhoto: (photoUri: string) => Promise<void>;
};

export function PlayerCameraModal({
  visible,
  playerName,
  playerColor,
  onClose,
  onUsePhoto,
}: PlayerCameraModalProps) {
  const { themeColors } = usePreferences();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCapturedUri(null);
      setIsTakingPhoto(false);
      setIsSavingPhoto(false);
    }
  }, [visible]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isTakingPhoto) return;
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
      }
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleUsePhoto = async () => {
    if (!capturedUri || isSavingPhoto) return;
    setIsSavingPhoto(true);
    try {
      await onUsePhoto(capturedUri);
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const renderBody = () => {
    if (!permission) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator color={playerColor} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.stateWrap}>
          <Ionicons name="camera-outline" size={44} color={playerColor} />
          <Text style={[styles.stateTitle, { color: themeColors.text }]}>Acces camera requis</Text>
          <Text style={[styles.stateText, { color: themeColors.mutedText }]}>
            Autorise la camera pour prendre la photo des dominos de {playerName}.
          </Text>
          <Pressable
            onPress={() => void requestPermission()}
            style={[styles.permissionBtn, { backgroundColor: playerColor }]}>
            <Text style={styles.permissionBtnText}>Autoriser</Text>
          </Pressable>
        </View>
      );
    }

    if (capturedUri) {
      return <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="cover" />;
    }

    return (
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        animateShutter
      />
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: themeColors.text }]}>Camera joueur</Text>
              <Text style={[styles.subtitle, { color: playerColor }]}>{playerName}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={themeColors.text} />
            </Pressable>
          </View>

          <View style={[styles.viewport, { backgroundColor: '#0F172A' }]}>{renderBody()}</View>

          <View style={[styles.infoBar, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
            <Ionicons name="scan-outline" size={18} color={playerColor} />
            <Text style={[styles.infoText, { color: themeColors.mutedText }]}>
              Photo enregistree pour ce joueur. Le branchement IA temps reel reste a integrer.
            </Text>
          </View>

          <View style={styles.actions}>
            {capturedUri ? (
              <>
                <Pressable
                  onPress={() => setCapturedUri(null)}
                  style={[styles.secondaryBtn, { borderColor: themeColors.border }]}>
                  <Text style={[styles.secondaryBtnText, { color: themeColors.text }]}>Reprendre</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleUsePhoto()}
                  style={[styles.primaryBtn, { backgroundColor: playerColor, opacity: isSavingPhoto ? 0.7 : 1 }]}>
                  <Text style={styles.primaryBtnText}>{isSavingPhoto ? 'Enregistrement...' : 'Utiliser'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
                  style={[styles.secondaryIconBtn, { borderColor: themeColors.border }]}>
                  <Ionicons name="camera-reverse-outline" size={22} color={themeColors.text} />
                </Pressable>
                <Pressable
                  onPress={() => void handleTakePhoto()}
                  style={[styles.captureBtnOuter, { borderColor: playerColor }]}>
                  <View style={[styles.captureBtnInner, { backgroundColor: playerColor }]}>
                    {isTakingPhoto ? <ActivityIndicator color="#FFF" /> : null}
                  </View>
                </Pressable>
                <Pressable onPress={onClose} style={[styles.secondaryIconBtn, { borderColor: themeColors.border }]}>
                  <Ionicons name="arrow-back-outline" size={22} color={themeColors.text} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.76)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '700',
  },
  viewport: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 24,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  infoBar: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1.2,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  stateText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  permissionBtnText: {
    color: '#FFF',
    fontWeight: '800',
  },
});
