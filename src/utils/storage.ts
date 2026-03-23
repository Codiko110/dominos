import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallback en cas de problème native (ex: AsyncStorage "legacy" non disponible).
// Objectif: ne pas planter l'app; le jeu reste fonctionnel même si le stockage persistant échoue.
const memoryStore = new Map<string, string>();

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    try {
      const raw = memoryStore.get(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value);
  // Toujours sauvegarder aussi en mémoire (pour éviter une perte totale).
  memoryStore.set(key, raw);
  try {
    await AsyncStorage.setItem(key, raw);
  } catch {
    // Silencieux volontairement : on continue sans persistance native.
  }
}

