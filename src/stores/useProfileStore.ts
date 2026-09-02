import { create } from 'zustand';
import { ScrcpyProfile } from '../types/profile';
import { SMART_PRESETS } from '../lib/commandBuilder';
import { readStoredObject, writeStoredJson } from '../lib/storage';
import { loadCustomProfiles, saveCustomProfiles } from '../lib/profileStorage';

interface ProfileStore {
  profiles: ScrcpyProfile[];
  selectedProfileId: string | null;

  addProfile: (profile: Omit<ScrcpyProfile, 'id' | 'createdAt' | 'isBuiltIn'>) => void;
  updateProfile: (id: string, partial: Partial<ScrcpyProfile>) => void;
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSelectedProfileId: (id: string | null) => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => {
  const savedCustomProfiles = loadCustomProfiles();
  const builtInFavorites = readStoredObject<Record<string, boolean>>(
    'scrcpy-built-in-favorites',
    {}
  );
  const builtIns = SMART_PRESETS.map((profile) => ({
    ...profile,
    isFavorite: builtInFavorites[profile.id] ?? profile.isFavorite,
  }));
  const allProfiles = [...builtIns, ...savedCustomProfiles];

  const saveCustom = (profiles: ScrcpyProfile[]) => {
    saveCustomProfiles(profiles);
  };

  const saveBuiltInFavorites = (profiles: ScrcpyProfile[]) => {
    const favorites = Object.fromEntries(
      profiles.filter((profile) => profile.isBuiltIn).map((profile) => [profile.id, !!profile.isFavorite])
    );
    writeStoredJson('scrcpy-built-in-favorites', favorites);
  };

  const createProfileId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `profile-${crypto.randomUUID()}`;
    }
    return `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  return {
    profiles: allProfiles,
    selectedProfileId: 'preset-balanced',

    addProfile: (profileData) => {
      const newProf: ScrcpyProfile = {
        ...profileData,
        id: createProfileId(),
        isBuiltIn: false,
        createdAt: Date.now(),
      };
      set((state) => {
        const updated = [...state.profiles, newProf];
        saveCustom(updated);
        return { profiles: updated, selectedProfileId: newProf.id };
      });
    },

    updateProfile: (id, partial) => {
      set((state) => {
        const updated = state.profiles.map((p) => (p.id === id ? { ...p, ...partial } : p));
        saveCustom(updated);
        return { profiles: updated };
      });
    },

    deleteProfile: (id) => {
      set((state) => {
        const target = state.profiles.find((p) => p.id === id);
        if (target?.isBuiltIn) return state; // cannot delete built-in presets
        const updated = state.profiles.filter((p) => p.id !== id);
        saveCustom(updated);
        return {
          profiles: updated,
          selectedProfileId: state.selectedProfileId === id ? 'preset-balanced' : state.selectedProfileId,
        };
      });
    },

    duplicateProfile: (id) => {
      const target = get().profiles.find((p) => p.id === id);
      if (!target) return;
      const dup: ScrcpyProfile = {
        ...target,
        id: createProfileId(),
        name: `${target.name} (Copy)`,
        isBuiltIn: false,
        createdAt: Date.now(),
      };
      set((state) => {
        const updated = [...state.profiles, dup];
        saveCustom(updated);
        return { profiles: updated, selectedProfileId: dup.id };
      });
    },

    toggleFavorite: (id) => {
      set((state) => {
        const updated = state.profiles.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
        saveCustom(updated);
        saveBuiltInFavorites(updated);
        return { profiles: updated };
      });
    },

    setSelectedProfileId: (id) => set({ selectedProfileId: id }),
  };
});
