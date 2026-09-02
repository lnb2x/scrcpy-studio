import type { ScrcpyProfile } from '@/types/profile';
import {
  readStoredArray,
  readStoredJson,
  writeStoredJson,
  type StorageLike,
} from './storage';

export const PROFILE_SCHEMA_VERSION = 2 as const;
export const PROFILE_STORAGE_KEY = 'scrcpy-profile-storage';
export const LEGACY_PROFILE_STORAGE_KEY = 'scrcpy-custom-profiles';

export interface ProfileStorageV2 {
  schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  profiles: ScrcpyProfile[];
}

function isProfile(value: unknown): value is ScrcpyProfile {
  if (typeof value !== 'object' || value === null) return false;
  const profile = value as Partial<ScrcpyProfile>;
  return (
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.description === 'string' &&
    typeof profile.iconName === 'string' &&
    typeof profile.createdAt === 'number' &&
    typeof profile.config === 'object' &&
    profile.config !== null
  );
}

export function migrateProfileStorage(value: unknown): ProfileStorageV2 {
  if (Array.isArray(value)) {
    return {
      schemaVersion: PROFILE_SCHEMA_VERSION,
      profiles: value.filter(isProfile).map((profile) => ({
        ...profile,
        isBuiltIn: false,
        autoLaunch: false,
      })),
    };
  }

  if (typeof value === 'object' && value !== null) {
    const envelope = value as { schemaVersion?: unknown; profiles?: unknown };
    if (envelope.schemaVersion === PROFILE_SCHEMA_VERSION && Array.isArray(envelope.profiles)) {
      return {
        schemaVersion: PROFILE_SCHEMA_VERSION,
        profiles: envelope.profiles.filter(isProfile).map((profile) => ({
          ...profile,
          isBuiltIn: false,
          autoLaunch: profile.autoLaunch === true,
        })),
      };
    }
  }

  return { schemaVersion: PROFILE_SCHEMA_VERSION, profiles: [] };
}

export function loadCustomProfiles(storage?: StorageLike | null): ScrcpyProfile[] {
  const current = readStoredJson<{ schemaVersion?: unknown; profiles?: unknown } | null>(
    PROFILE_STORAGE_KEY,
    null,
    (value): value is { schemaVersion?: unknown; profiles?: unknown } =>
      typeof value === 'object' && value !== null && !Array.isArray(value),
    storage
  );
  if (current) {
    const migrated = migrateProfileStorage(current);
    if (current.schemaVersion !== PROFILE_SCHEMA_VERSION) {
      writeStoredJson(PROFILE_STORAGE_KEY, migrated, storage);
    }
    return migrated.profiles;
  }

  const legacyProfiles = readStoredArray<ScrcpyProfile>(LEGACY_PROFILE_STORAGE_KEY, storage);
  const migrated = migrateProfileStorage(legacyProfiles);
  if (migrated.profiles.length > 0) {
    // Keep the legacy key as a recovery copy until a later schema version.
    writeStoredJson(PROFILE_STORAGE_KEY, migrated, storage);
  }
  return migrated.profiles;
}

export function saveCustomProfiles(
  profiles: readonly ScrcpyProfile[],
  storage?: StorageLike | null
): boolean {
  return writeStoredJson(
    PROFILE_STORAGE_KEY,
    {
      schemaVersion: PROFILE_SCHEMA_VERSION,
      profiles: profiles.filter((profile) => !profile.isBuiltIn),
    } satisfies ProfileStorageV2,
    storage
  );
}
