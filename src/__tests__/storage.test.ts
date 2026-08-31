import { describe, expect, it } from 'vitest';
import { readStoredArray, readStoredJson, readStoredObject, writeStoredJson } from '../lib/storage';

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    has: (key: string) => values.has(key),
  };
}

describe('safe local storage helpers', () => {
  it('returns the fallback and removes malformed JSON', () => {
    const storage = createStorage({ broken: '{not-json' });

    expect(readStoredArray('broken', storage)).toEqual([]);
    expect(storage.has('broken')).toBe(false);
  });

  it('rejects values with an unexpected shape', () => {
    const storage = createStorage({ settings: '["not", "an", "object"]' });
    const fallback = { enabled: true };

    expect(readStoredObject('settings', fallback, storage)).toEqual(fallback);
    expect(storage.has('settings')).toBe(false);
  });

  it('supports caller-provided validation', () => {
    const storage = createStorage({ count: '42' });

    expect(
      readStoredJson('count', 0, (value): value is number => typeof value === 'number', storage)
    ).toBe(42);
  });

  it('does not throw when writes fail', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => undefined,
    };

    expect(writeStoredJson('key', { value: true }, storage)).toBe(false);
  });
});
