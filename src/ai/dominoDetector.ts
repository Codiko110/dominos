import { toByteArray } from 'base64-js';
import { Asset } from 'expo-asset';
import { readAsStringAsync } from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';
import type { TfliteModel } from 'react-native-fast-tflite';

export type DetectionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
};

export type DominoDetectionResult = {
  points: number;
  boxes: DetectionBox[];
  modelInput: {
    width: number;
    height: number;
    dataType: string;
  };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODEL_SOURCE = require('../../assets/model/best_float32.tflite');
const CONFIDENCE_THRESHOLD = 0.5;
const NMS_THRESHOLD = 0.4;

let modelPromise: Promise<TfliteModel> | null = null;

export async function warmupDominoDetector() {
  await getModel();
}

async function getFastTfliteModule() {
  try {
    return await import('react-native-fast-tflite');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('NitroModules') ||
      message.includes('TurboModuleRegistry') ||
      message.includes('native "NitroModules"')
    ) {
      throw new Error(
        "Le module TFLite natif n'est pas disponible dans cette build. Lance un dev build Expo/EAS apres reconstruction de l'application."
      );
    }
    throw error;
  }
}

async function getModelSource() {
  const asset = Asset.fromModule(MODEL_SOURCE);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error("Impossible de localiser le fichier du modele TFLite dans l'application.");
  }

  return { url: uri };
}

async function getModel(): Promise<TfliteModel> {
  if (!modelPromise) {
    modelPromise = Promise.all([getFastTfliteModule(), getModelSource()]).then(
      ([{ loadTensorflowModel }, source]) => loadTensorflowModel(source, [])
    );
  }
  return modelPromise;
}

function getModelInputConfig(model: TfliteModel) {
  const input = model.inputs[0];
  if (!input) {
    throw new Error("Le modele n'a pas d'entree.");
  }

  const [, dim1, dim2, dim3] = input.shape;

  if (input.shape.length !== 4) {
    throw new Error(`Entree modele non supportee: ${input.shape.join('x')}`);
  }

  if (dim3 === 3) {
    return {
      width: dim2,
      height: dim1,
      channels: dim3,
      layout: 'nhwc' as const,
      dataType: input.dataType,
    };
  }

  if (dim1 === 3) {
    return {
      width: dim3,
      height: dim2,
      channels: dim1,
      layout: 'nchw' as const,
      dataType: input.dataType,
    };
  }

  throw new Error(`Format d'entree non reconnu: ${input.shape.join('x')}`);
}

function decodeJpegBase64(base64: string) {
  const jpegBytes = toByteArray(base64);
  return jpeg.decode(jpegBytes, {
    useTArray: true,
    formatAsRGBA: true,
    maxMemoryUsageInMB: 512,
    tolerantDecoding: true,
  });
}

function resizeRgbaNearestNeighbor(
  source: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const resized = new Uint8Array(targetWidth * targetHeight * 4);

  for (let y = 0; y < targetHeight; y += 1) {
    const srcY = Math.min(sourceHeight - 1, Math.floor((y / targetHeight) * sourceHeight));
    for (let x = 0; x < targetWidth; x += 1) {
      const srcX = Math.min(sourceWidth - 1, Math.floor((x / targetWidth) * sourceWidth));
      const srcOffset = (srcY * sourceWidth + srcX) * 4;
      const dstOffset = (y * targetWidth + x) * 4;

      resized[dstOffset] = source[srcOffset];
      resized[dstOffset + 1] = source[srcOffset + 1];
      resized[dstOffset + 2] = source[srcOffset + 2];
      resized[dstOffset + 3] = source[srcOffset + 3];
    }
  }

  return resized;
}

function createInputBufferFromRGBA(
  rgba: Uint8Array,
  width: number,
  height: number,
  layout: 'nhwc' | 'nchw',
  dataType: string
): ArrayBuffer {
  const totalPixels = width * height;

  if (dataType === 'float32') {
    const tensor = new Float32Array(totalPixels * 3);

    if (layout === 'nhwc') {
      for (let i = 0; i < totalPixels; i += 1) {
        const rgbaOffset = i * 4;
        const tensorOffset = i * 3;
        tensor[tensorOffset] = rgba[rgbaOffset] / 255;
        tensor[tensorOffset + 1] = rgba[rgbaOffset + 1] / 255;
        tensor[tensorOffset + 2] = rgba[rgbaOffset + 2] / 255;
      }
    } else {
      const channelStride = totalPixels;
      for (let i = 0; i < totalPixels; i += 1) {
        const rgbaOffset = i * 4;
        tensor[i] = rgba[rgbaOffset] / 255;
        tensor[channelStride + i] = rgba[rgbaOffset + 1] / 255;
        tensor[channelStride * 2 + i] = rgba[rgbaOffset + 2] / 255;
      }
    }

    return tensor.buffer;
  }

  if (dataType === 'uint8') {
    const tensor = new Uint8Array(totalPixels * 3);

    if (layout === 'nhwc') {
      for (let i = 0; i < totalPixels; i += 1) {
        const rgbaOffset = i * 4;
        const tensorOffset = i * 3;
        tensor[tensorOffset] = rgba[rgbaOffset];
        tensor[tensorOffset + 1] = rgba[rgbaOffset + 1];
        tensor[tensorOffset + 2] = rgba[rgbaOffset + 2];
      }
    } else {
      const channelStride = totalPixels;
      for (let i = 0; i < totalPixels; i += 1) {
        const rgbaOffset = i * 4;
        tensor[i] = rgba[rgbaOffset];
        tensor[channelStride + i] = rgba[rgbaOffset + 1];
        tensor[channelStride * 2 + i] = rgba[rgbaOffset + 2];
      }
    }

    return tensor.buffer;
  }

  throw new Error(`Type d'entree non supporte: ${dataType}`);
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function iou(a: DetectionBox, b: DetectionBox) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const interWidth = Math.max(0, right - left);
  const interHeight = Math.max(0, bottom - top);
  const intersection = interWidth * interHeight;
  const union = a.width * a.height + b.width * b.height - intersection;
  return union <= 0 ? 0 : intersection / union;
}

function applyNms(boxes: DetectionBox[]) {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const kept: DetectionBox[] = [];

  while (sorted.length > 0) {
    const current = sorted.shift();
    if (!current) break;
    kept.push(current);

    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      if (iou(current, sorted[i]!) > NMS_THRESHOLD) {
        sorted.splice(i, 1);
      }
    }
  }

  return kept;
}

function parseDetectionOutput(buffer: ArrayBuffer, shape: number[]): DetectionBox[] {
  const output = new Float32Array(buffer);
  const dims = shape.length > 2 && shape[0] === 1 ? shape.slice(1) : shape;

  if (dims.length !== 2) {
    throw new Error(`Sortie modele non supportee: ${shape.join('x')}`);
  }

  const boxes: DetectionBox[] = [];

  if (dims[0] === 5) {
    const count = dims[1];
    for (let i = 0; i < count; i += 1) {
      const x = output[i];
      const y = output[count + i];
      const w = output[count * 2 + i];
      const h = output[count * 3 + i];
      const conf = output[count * 4 + i];

      if (conf <= CONFIDENCE_THRESHOLD) continue;

      const x1 = clamp01(x - w / 2);
      const y1 = clamp01(y - h / 2);
      const x2 = clamp01(x + w / 2);
      const y2 = clamp01(y + h / 2);

      boxes.push({
        x: x1,
        y: y1,
        width: Math.max(0, x2 - x1),
        height: Math.max(0, y2 - y1),
        score: conf,
      });
    }
    return applyNms(boxes);
  }

  if (dims[1] === 5) {
    const count = dims[0];
    for (let i = 0; i < count; i += 1) {
      const offset = i * 5;
      const x = output[offset];
      const y = output[offset + 1];
      const w = output[offset + 2];
      const h = output[offset + 3];
      const conf = output[offset + 4];

      if (conf <= CONFIDENCE_THRESHOLD) continue;

      const x1 = clamp01(x - w / 2);
      const y1 = clamp01(y - h / 2);
      const x2 = clamp01(x + w / 2);
      const y2 = clamp01(y + h / 2);

      boxes.push({
        x: x1,
        y: y1,
        width: Math.max(0, x2 - x1),
        height: Math.max(0, y2 - y1),
        score: conf,
      });
    }
    return applyNms(boxes);
  }

  throw new Error(`Sortie YOLO inattendue: ${shape.join('x')}`);
}

export async function detectDominoPoints(photoUri: string): Promise<DominoDetectionResult> {
  try {
    const model = await getModel();
    const inputConfig = getModelInputConfig(model);
    const photoBase64 = await readAsStringAsync(photoUri, { encoding: 'base64' });
    if (!photoBase64) {
      throw new Error("Impossible de lire l'image capturee.");
    }

    const decoded = decodeJpegBase64(photoBase64);
    const resizedRgba = resizeRgbaNearestNeighbor(
      decoded.data,
      decoded.width,
      decoded.height,
      inputConfig.width,
      inputConfig.height
    );

    const inputBuffer = createInputBufferFromRGBA(
      resizedRgba,
      inputConfig.width,
      inputConfig.height,
      inputConfig.layout,
      inputConfig.dataType
    );

    const outputs = await model.run([inputBuffer]);
    const mainOutput = outputs[0];

    if (!mainOutput) {
      throw new Error('Le modele ne retourne aucune sortie.');
    }

    const outputTensor = model.outputs[0];
    if (!outputTensor) {
      throw new Error("Le modele n'a pas de sortie exploitable.");
    }

    const boxes = parseDetectionOutput(mainOutput, outputTensor.shape);

    return {
      points: boxes.length,
      boxes,
      modelInput: {
        width: inputConfig.width,
        height: inputConfig.height,
        dataType: inputConfig.dataType,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('TurboModuleRegistry') ||
      message.includes('NitroModules') ||
      message.includes('native "NitroModules"')
    ) {
      throw new Error(
        "Le module TFLite natif n'est pas disponible dans cette build. Lance un dev build Expo/EAS apres reconstruction de l'application."
      );
    }
    throw new Error(message || "L'analyse TFLite a echoue pour une raison inconnue.");
  }
}
