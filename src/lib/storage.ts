export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readStoredJson<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
  storage: StorageLike | null = getDefaultStorage()
): T {
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return parsed;

    storage.removeItem(key);
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage may be unavailable or read-only. Falling back is sufficient.
    }
  }

  return fallback;
}

export function readStoredArray<T>(
  key: string,
  storage: StorageLike | null = getDefaultStorage()
): T[] {
  return readStoredJson<T[]>(key, [], Array.isArray, storage);
}

export function readStoredObject<T extends object>(
  key: string,
  fallback: T,
  storage: StorageLike | null = getDefaultStorage()
): T {
  return readStoredJson<T>(
    key,
    fallback,
    (value): value is T => typeof value === 'object' && value !== null && !Array.isArray(value),
    storage
  );
}

export function writeStoredJson(
  key: string,
  value: unknown,
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
