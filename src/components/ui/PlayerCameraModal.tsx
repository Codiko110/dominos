import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { usePreferences } from '@/context/PreferencesContext';
import type { DetectionBox, DominoDetectionResult } from '@/ai/dominoDetector';

type PlayerCameraModalProps = {
  visible: boolean;
  playerName: string;
  playerColor: string;
  onClose: () => void;
  onWarmup?: () => Promise<void>;
  onAnalyzePhoto: (photoUri: string) => Promise<DominoDetectionResult>;
  onUsePhoto: (photoUri: string, analysis: DominoDetectionResult) => Promise<void>;
};

export function PlayerCameraModal({
  visible,
  playerName,
  playerColor,
  onClose,
  onWarmup,
  onAnalyzePhoto,
  onUsePhoto,
}: PlayerCameraModalProps) {
  const { themeColors } = usePreferences();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DominoDetectionResult | null>(null);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraViewKey, setCameraViewKey] = useState(0);
  const [lastCreditedPoints, setLastCreditedPoints] = useState<number | null>(null);

  const resetPreviewState = () => {
    setCapturedUri(null);
    setIsTakingPhoto(false);
    setIsSavingPhoto(false);
    setIsAnalyzing(false);
    setAnalysisError(null);
    setAnalysis(null);
  };

  const resetCameraSession = () => {
    resetPreviewState();
    setLastCreditedPoints(null);
    setPictureSize(undefined);
    setIsCameraReady(false);
    setCameraViewKey((current) => current + 1);
  };

  const prepareNextCapture = (creditedPoints?: number) => {
    resetPreviewState();
    if (typeof creditedPoints === 'number') {
      setLastCreditedPoints(creditedPoints);
    }
    setPictureSize(undefined);
    setIsCameraReady(false);
    setCameraViewKey((current) => current + 1);
  };

  useEffect(() => {
    if (!visible || !permission?.granted || !cameraRef.current || !isCameraReady) return;

    let cancelled = false;

    const selectPictureSize = async () => {
      try {
        const sizes = await cameraRef.current?.getAvailablePictureSizesAsync();
        if (!sizes || sizes.length === 0 || cancelled) return;

        const parsed = sizes
          .map((size) => {
            const match = /^(\d+)x(\d+)$/i.exec(size);
            if (!match) return null;
            const width = Number(match[1]);
            const height = Number(match[2]);
            return {
              raw: size,
              width,
              height,
              area: width * height,
              edge: Math.max(width, height),
            };
          })
          .filter((item): item is NonNullable<typeof item> => !!item)
          .sort((a, b) => a.area - b.area);

        if (parsed.length === 0) return;

        const targetEdge = 1280;
        const best =
          parsed.find((item) => item.edge >= targetEdge) ??
          parsed[0] ??
          parsed[0];

        if (!cancelled) {
          setPictureSize(best.raw);
        }
      } catch {
        if (!cancelled) {
          setPictureSize(undefined);
        }
      }
    };

    void selectPictureSize();

    return () => {
      cancelled = true;
    };
  }, [visible, permission?.granted, isCameraReady]);

  useEffect(() => {
    if (!visible || !onWarmup) return;
    void onWarmup().catch(() => {
      // Warmup is opportunistic only.
    });
  }, [visible, onWarmup]);

  useEffect(() => {
    if (!visible) {
      resetCameraSession();
      return;
    }
    setLastCreditedPoints(null);
  }, [visible, playerName]);

  useEffect(() => {
    if (!capturedUri) {
      setIsAnalyzing(false);
      setAnalysisError(null);
      setAnalysis(null);
      return;
    }

    let cancelled = false;

    const runAnalysis = async () => {
      setIsAnalyzing(true);
      setAnalysisError(null);
      setAnalysis(null);
      try {
        const result = await onAnalyzePhoto(capturedUri);
        if (!cancelled) {
          setAnalysis(result);
        }
      } catch (error) {
        if (!cancelled) {
          setAnalysisError(error instanceof Error ? error.message : "L'analyse a echoue.");
        }
      } finally {
        if (!cancelled) {
          setIsAnalyzing(false);
        }
      }
    };

    void runAnalysis();

    return () => {
      cancelled = true;
    };
  }, [capturedUri, onAnalyzePhoto]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isTakingPhoto || isSavingPhoto || !isCameraReady) return;
    setLastCreditedPoints(null);
    setAnalysisError(null);
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        // Android back cameras may return white/invalid frames when skipProcessing is true.
        // Keep processing enabled there for stable captures.
        skipProcessing: Platform.OS === 'ios',
        exif: false,
        base64: false,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'La capture de la photo a echoue.');
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleUsePhoto = async () => {
    if (!capturedUri || !analysis || isSavingPhoto || isAnalyzing) return;
    setIsSavingPhoto(true);
    try {
      await onUsePhoto(capturedUri, analysis);
      prepareNextCapture(analysis.points);
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const renderDetectionOverlay = (boxes: DetectionBox[]) => {
    if (boxes.length === 0) return null;

    return (
      <View pointerEvents="none" style={styles.overlayBoxes}>
        {boxes.map((box, index) => (
          <View
            key={`${index}_${box.x}_${box.y}`}
            style={[
              styles.box,
              {
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
              },
            ]}
          />
        ))}
      </View>
    );
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
      return (
        <View style={styles.previewWrap}>
          <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="cover" />
          {analysis ? renderDetectionOverlay(analysis.boxes) : null}
          {isAnalyzing ? (
            <View style={styles.analysisOverlay}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.analysisOverlayText}>Analyse en cours...</Text>
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <CameraView
        key={cameraViewKey}
        ref={cameraRef}
        style={styles.camera}
        facing={'back' as CameraType}
        animateShutter={false}
        pictureSize={pictureSize}
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={() => setAnalysisError("Impossible d'initialiser la camera.")}
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
            <Ionicons name={analysisError ? 'warning-outline' : 'scan-outline'} size={18} color={playerColor} />
            <Text style={[styles.infoText, { color: themeColors.mutedText }]}>
              {analysisError
                ? analysisError
                : analysis
                  ? `Points detectes: ${analysis.points}`
                  : lastCreditedPoints !== null
                    ? `${lastCreditedPoints} pts credites pour ${playerName}. Tu peux prendre la photo suivante.`
                  : capturedUri
                    ? 'Photo capturee. Analyse du modele en cours.'
                    : `Cadre les dominos de ${playerName}, puis prends la photo pour compter les points.`}
            </Text>
          </View>

          <View style={styles.actions}>
            {capturedUri ? (
              <>
                <Pressable
                  onPress={() => prepareNextCapture()}
                  style={[styles.secondaryBtn, { borderColor: themeColors.border }]}>
                  <Text style={[styles.secondaryBtnText, { color: themeColors.text }]}>Reprendre</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleUsePhoto()}
                  disabled={!analysis || isAnalyzing || isSavingPhoto}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: playerColor,
                      opacity: !analysis || isAnalyzing || isSavingPhoto ? 0.5 : 1,
                    },
                  ]}>
                  <Text style={styles.primaryBtnText}>
                    {isSavingPhoto
                      ? 'Credit...'
                      : analysis
                        ? `Crediter ${analysis.points} pts`
                        : 'Analyse...'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => void handleTakePhoto()}
                  disabled={!isCameraReady || isTakingPhoto || isSavingPhoto}
                  style={[
                    styles.captureBtnOuter,
                    {
                      borderColor: playerColor,
                      opacity: !isCameraReady || isTakingPhoto || isSavingPhoto ? 0.6 : 1,
                    },
                  ]}>
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
  previewWrap: {
    width: '100%',
    height: '100%',
  },
  overlayBoxes: {
    ...StyleSheet.absoluteFillObject,
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
  },
  analysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analysisOverlayText: {
    color: '#FFF',
    fontWeight: '700',
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
