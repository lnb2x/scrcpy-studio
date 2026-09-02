import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { AppSettings } from '../types/settings';
import { useI18nStore } from '../lib/i18n';
import { readStoredObject, writeStoredJson } from '../lib/storage';
import type { EnvironmentDiagnostics, RuntimeComponent } from '../types/runtime';
import { formatAppError } from '@/lib/errors';

interface ExecutableDetection {
  scrcpyPath?: string;
  scrcpyVersion?: string;
  adbPath?: string;
  adbVersion?: string;
  isScrcpyReady: boolean;
  isAdbReady: boolean;
  detectedLocations: string[];
}

interface SettingsStore {
  settings: AppSettings;
  detection: ExecutableDetection | null;
  diagnostics: EnvironmentDiagnostics | null;
  isDetecting: boolean;
  isRepairing: boolean;
  isHydrated: boolean;
  runtimeError: string | null;

  updateSettings: (partial: Partial<AppSettings>) => void;
  loadSettings: () => Promise<void>;
  detectExecutables: () => Promise<ExecutableDetection>;
  checkRuntime: () => Promise<EnvironmentDiagnostics | null>;
  testRuntime: (component: 'scrcpy' | 'adb') => Promise<RuntimeComponent | null>;
  repairRuntime: () => Promise<EnvironmentDiagnostics | null>;
  setCustomScrcpyPath: (path: string) => Promise<boolean>;
  setCustomAdbPath: (path: string) => Promise<boolean>;
}

const DEFAULT_SETTINGS: AppSettings = {
  scrcpyPath: '',
  adbPath: '',
  autoDetectExecutables: true,
  launchOnStartup: false,
  minimizeToTray: false,
  closeToTray: false,
  autoRefreshDevices: true,
  autoRefreshInterval: 4,
  rememberLastDevice: true,
  rememberLastProfile: true,
  theme: 'dark',
  accentColor: 'blue',
  density: 'comfortable',
  animation: 'full',
  language: 'en',
  recordingsDir: '',
  screenshotsDir: '',
  logsDir: '',
  defaultRecordFormat: 'mp4',
  developerMode: false,
  basicModeOnly: false,
};

let loadSettingsPromise: Promise<void> | null = null;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  detection: null,
  diagnostics: null,
  isDetecting: false,
  isRepairing: false,
  isHydrated: false,
  runtimeError: null,

  updateSettings: (partial) => {
    set((state) => {
      const updated = { ...state.settings, ...partial };
      writeStoredJson('scrcpy-studio-settings', updated);

      // Apply theme
      if (partial.theme) {
        document.documentElement.classList.remove('theme-light', 'dark');
        if (partial.theme === 'light') {
          document.documentElement.classList.add('theme-light');
        } else if (partial.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          // system
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.add(prefersDark ? 'dark' : 'theme-light');
        }
      }

      // Apply accent
      if (partial.accentColor) {
        document.documentElement.setAttribute('data-accent', partial.accentColor);
      }

      // Apply language
      if (partial.language) {
        useI18nStore.getState().setLanguage(partial.language);
      }

      return { settings: updated };
    });
  },

  loadSettings: async () => {
    if (loadSettingsPromise) return loadSettingsPromise;

    loadSettingsPromise = (async () => {
      try {
        const saved = readStoredObject<Partial<AppSettings>>('scrcpy-studio-settings', {});
        const loaded = { ...DEFAULT_SETTINGS, ...saved };

        const directoriesPromise = invoke<{
          picturesDir: string;
          videosDir: string;
          downloadsDir: string;
        }>('get_default_directories').catch((error) => {
          console.warn('Could not fetch default directories:', error);
          return null;
        });

        const restoreCustomPath = async (command: string, path: string) => {
          if (!path.trim()) return false;
          try {
            await invoke(command, { path: path.trim() });
            return true;
          } catch (error) {
            console.warn(`Could not restore ${command}:`, error);
            return false;
          }
        };

        const [dirs, [scrcpyPathRestored, adbPathRestored]] = await Promise.all([
          directoriesPromise,
          Promise.all([
            restoreCustomPath('set_custom_scrcpy_path', loaded.scrcpyPath),
            restoreCustomPath('set_custom_adb_path', loaded.adbPath),
          ]),
        ]);

        if (dirs) {
          if (!loaded.recordingsDir) loaded.recordingsDir = dirs.videosDir;
          if (!loaded.screenshotsDir) loaded.screenshotsDir = dirs.picturesDir;
        }

        const detection = await get().detectExecutables();
        if (!scrcpyPathRestored && detection.scrcpyPath) loaded.scrcpyPath = detection.scrcpyPath;
        if (!adbPathRestored && detection.adbPath) loaded.adbPath = detection.adbPath;
        await get().checkRuntime();

        get().updateSettings(loaded);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        set({ isHydrated: true });
      }
    })();

    try {
      await loadSettingsPromise;
    } finally {
      loadSettingsPromise = null;
    }
  },

  detectExecutables: async () => {
    set({ isDetecting: true, runtimeError: null });
    try {
      const det = await invoke<ExecutableDetection>('detect_executables');
      set({ detection: det, isDetecting: false });
      return det;
    } catch (error) {
      set({ isDetecting: false });
      const emptyDet: ExecutableDetection = {
        isScrcpyReady: false,
        isAdbReady: false,
        detectedLocations: [],
      };
      set({ detection: emptyDet, runtimeError: formatAppError(error, 'RUNTIME_DETECT_FAILED') });
      return emptyDet;
    }
  },

  checkRuntime: async () => {
    set({ isDetecting: true, runtimeError: null });
    try {
      const diagnostics = await invoke<EnvironmentDiagnostics>('check_runtime');
      set({ diagnostics, isDetecting: false });
      return diagnostics;
    } catch (error) {
      console.warn('Runtime diagnostics failed:', error);
      set({ isDetecting: false, runtimeError: formatAppError(error, 'RUNTIME_CHECK_FAILED') });
      return null;
    }
  },

  testRuntime: async (component) => {
    set({ runtimeError: null });
    try {
      const result = await invoke<RuntimeComponent>('test_runtime', { component });
      set((state) => ({
        diagnostics: state.diagnostics
          ? { ...state.diagnostics, [component]: result, checkedAt: Date.now() }
          : state.diagnostics,
      }));
      return result;
    } catch (error) {
      console.warn(`Runtime test failed for ${component}:`, error);
      set({ runtimeError: formatAppError(error, 'RUNTIME_TEST_FAILED') });
      return null;
    }
  },

  repairRuntime: async () => {
    set({ isRepairing: true, runtimeError: null });
    try {
      const diagnostics = await invoke<EnvironmentDiagnostics>('repair_runtime');
      set({ diagnostics, isRepairing: false });
      await get().detectExecutables();
      return diagnostics;
    } catch (error) {
      console.warn('Runtime repair failed:', error);
      set({
        isRepairing: false,
        runtimeError: formatAppError(error, 'RUNTIME_REPAIR_FAILED'),
      });
      return null;
    }
  },

  setCustomScrcpyPath: async (path: string) => {
    const normalizedPath = path.trim();
    set({ runtimeError: null });
    try {
      await invoke('set_custom_scrcpy_path', { path: normalizedPath });
      get().updateSettings({ scrcpyPath: normalizedPath });
      await get().detectExecutables();
      return true;
    } catch (e) {
      console.error('Failed to set custom scrcpy path:', e);
      set({ runtimeError: formatAppError(e, 'SCRCPY_NOT_FOUND') });
      return false;
    }
  },

  setCustomAdbPath: async (path: string) => {
    const normalizedPath = path.trim();
    set({ runtimeError: null });
    try {
      await invoke('set_custom_adb_path', { path: normalizedPath });
      get().updateSettings({ adbPath: normalizedPath });
      await get().detectExecutables();
      return true;
    } catch (e) {
      console.error('Failed to set custom adb path:', e);
      set({ runtimeError: formatAppError(e, 'ADB_NOT_FOUND') });
      return false;
    }
  },
}));
