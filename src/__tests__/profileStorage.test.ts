import { describe, expect, it } from 'vitest';
import {
  LEGACY_PROFILE_STORAGE_KEY,
  loadCustomProfiles,
  migrateProfileStorage,
  PROFILE_SCHEMA_VERSION,
  PROFILE_STORAGE_KEY,
  saveCustomProfiles,
} from '../lib/profileStorage';

const legacyProfile = {
  id: 'legacy-1',
  name: 'Legacy Gaming',
  description: 'Imported profile',
  isBuiltIn: false,
  iconName: 'Gamepad2',
  config: { maxFps: 120 },
  createdAt: 100,
};

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    read: (key: string) => values.get(key),
  };
}

describe('versioned profile storage', () => {
  it('migrates the legacy unversioned array to schema v2 without data loss', () => {
    const migrated = migrateProfileStorage([legacyProfile]);
    expect(migrated.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
    expect(migrated.profiles[0]).toMatchObject({
      id: 'legacy-1',
      config: { maxFps: 120 },
      autoLaunch: false,
    });
  });

  it('loads the legacy key and persists the migrated envelope', () => {
    const storage = createStorage({
      [LEGACY_PROFILE_STORAGE_KEY]: JSON.stringify([legacyProfile]),
    });

    expect(loadCustomProfiles(storage)).toHaveLength(1);
    expect(JSON.parse(storage.read(PROFILE_STORAGE_KEY) ?? '{}')).toMatchObject({
      schemaVersion: 2,
      profiles: [{ id: 'legacy-1' }],
    });
    expect(storage.read(LEGACY_PROFILE_STORAGE_KEY)).toBeDefined();
  });

  it('round-trips device associations and keeps auto-launch opt-in', () => {
    const storage = createStorage();
    saveCustomProfiles(
      [
        {
          ...legacyProfile,
          deviceSerial: 'pixel-1',
          deviceModel: 'Pixel',
          autoLaunch: true,
        },
      ],
      storage
    );

    expect(loadCustomProfiles(storage)[0]).toMatchObject({
      deviceSerial: 'pixel-1',
      deviceModel: 'Pixel',
      autoLaunch: true,
    });
  });
});
