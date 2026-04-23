// Fallback en cas de problème native (ex: AsyncStorage "legacy" non disponible).
// Objectif: ne pas planter l'app; le jeu reste fonctionnel même si le stockage persistant échoue.
const memoryStore = new Map<string, string>();

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let nativeStoragePromise: Promise<AsyncStorageLike | null> | null = null;

async function getNativeStorage(): Promise<AsyncStorageLike | null> {
  if (!nativeStoragePromise) {
    nativeStoragePromise = (async () => {
      try {
        const mod = await import('@react-native-async-storage/async-storage');
        const candidate = (mod as { default?: unknown }).default ?? mod;
        const storage = candidate as Partial<AsyncStorageLike>;
        if (typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
          return storage as AsyncStorageLike;
        }
      } catch {
        // Module natif indisponible dans la build courante.
      }
      return null;
    })();
  }

  return nativeStoragePromise;
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  const nativeStorage = await getNativeStorage();
  try {
    if (!nativeStorage) throw new Error('Native storage unavailable');
    const raw = await nativeStorage.getItem(key);
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
  const nativeStorage = await getNativeStorage();
  try {
    if (!nativeStorage) throw new Error('Native storage unavailable');
    await nativeStorage.setItem(key, raw);
  } catch {
    // Silencieux volontairement : on continue sans persistance native.
  }
}
