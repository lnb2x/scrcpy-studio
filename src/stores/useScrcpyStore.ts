import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ScrcpyConfig, ScrcpySession } from '@/types/scrcpy';
import { ScrcpyProfile } from '@/types/profile';
import { buildScrcpyArgs, formatCommandString } from '@/lib/commandBuilder';
import { resolveSessionConfig, SessionMode } from '@/lib/sessionConfig';
import { readStoredArray, writeStoredJson } from '@/lib/storage';
import { useLogStore } from './useLogStore';
import { useDeviceStore } from './useDeviceStore';

const DEFAULT_CONFIG: ScrcpyConfig = {
  videoEnabled: true,
  videoCodec: 'h264',
  maxSize: 1600,
  maxFps: 60,
  videoBitrate: '8M',
  audioEnabled: true,
  audioSource: 'output',
  audioCodec: 'opus',
  audioBitrate: '128K',
  controlEnabled: true,
  keyboardMode: 'sdk',
  mouseMode: 'sdk',
  stayAwake: true,
  turnScreenOff: false,
  fullscreen: false,
  alwaysOnTop: false,
  windowBorderless: false,
  clipboardAutosync: true,
  customArgs: [],
};

interface ScrcpyStore {
  config: ScrcpyConfig;
  sessions: ScrcpySession[];
  history: ScrcpySession[];
  isLaunching: boolean;
  selectedPresetId: string;
  lastError: string | null;

  updateConfig: (partial: Partial<ScrcpyConfig>) => void;
  resetConfig: () => void;
  applyPreset: (preset: ScrcpyProfile) => void;
  startSession: (
    overrideConfig?: Partial<ScrcpyConfig>,
    mode?: SessionMode
  ) => Promise<ScrcpySession | null>;
  stopSession: (sessionId: string) => Promise<void>;
  fetchActiveSessions: () => Promise<void>;
  getGeneratedCommand: (executablePath?: string) => string;
  initEventListener: () => Promise<void>;
}

const HISTORY_LIMIT = 30;
const ACTIVE_STATUSES = new Set(['starting', 'running', 'stopping']);
const TERMINAL_STATUSES = new Set(['stopped', 'failed']);

function isSession(value: unknown): value is ScrcpySession {
  if (typeof value !== 'object' || value === null) return false;
  const session = value as Partial<ScrcpySession>;
  return (
    typeof session.id === 'string' &&
    typeof session.deviceSerial === 'string' &&
    typeof session.status === 'string' &&
    typeof session.startedAt === 'number' &&
    Array.isArray(session.command)
  );
}

function preferNewestSession(
  current: ScrcpySession | undefined,
  incoming: ScrcpySession
): ScrcpySession {
  if (current && TERMINAL_STATUSES.has(current.status) && !TERMINAL_STATUSES.has(incoming.status)) {
    return current;
  }
  return incoming;
}

function upsertHistory(history: ScrcpySession[], incoming: ScrcpySession): ScrcpySession[] {
  const current = history.find((session) => session.id === incoming.id);
  const resolved = preferNewestSession(current, incoming);
  return [resolved, ...history.filter((session) => session.id !== incoming.id)].slice(0, HISTORY_LIMIT);
}

function reconcileSessionState(
  sessions: ScrcpySession[],
  history: ScrcpySession[],
  incoming: ScrcpySession
) {
  const current =
    sessions.find((session) => session.id === incoming.id) ??
    history.find((session) => session.id === incoming.id);
  const resolved = preferNewestSession(current, incoming);
  const nextSessions = ACTIVE_STATUSES.has(resolved.status)
    ? [...sessions.filter((session) => session.id !== resolved.id), resolved]
    : sessions.filter((session) => session.id !== resolved.id);
  const nextHistory = upsertHistory(history, resolved);

  writeStoredJson('scrcpy-session-history', nextHistory);
  return { sessions: nextSessions, history: nextHistory };
}

let eventListenersPromise: Promise<unknown[]> | null = null;

export const useScrcpyStore = create<ScrcpyStore>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  sessions: [],
  history: readStoredArray<ScrcpySession>('scrcpy-session-history').filter(isSession).slice(0, HISTORY_LIMIT),
  isLaunching: false,
  selectedPresetId: 'preset-balanced',
  lastError: null,

  updateConfig: (partial) => {
    set((state) => ({
      config: { ...state.config, ...partial },
    }));
  },

  resetConfig: () => {
    set({
      config: { ...DEFAULT_CONFIG },
      selectedPresetId: 'preset-balanced',
    });
  },

  applyPreset: (preset) => {
    set((state) => ({
      config: {
        ...DEFAULT_CONFIG,
        ...preset.config,
        serial: state.config.serial, // preserve selected device
      },
      selectedPresetId: preset.id,
    }));
  },

  startSession: async (overrideConfig, mode = 'mirror') => {
    if (get().isLaunching) return null;

    set({ isLaunching: true, lastError: null });
    try {
      const activeSerial = useDeviceStore.getState().selectedSerial;
      const fullConfig = resolveSessionConfig(get().config, overrideConfig, activeSerial, mode);

      const session = await invoke<ScrcpySession>('start_scrcpy', {
        config: fullConfig,
        mode,
      });

      set((state) => {
        const reconciled = reconcileSessionState(state.sessions, state.history, session);
        return {
          ...reconciled,
          isLaunching: false,
          lastError: null,
        };
      });

      return session;
    } catch (err) {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? (err as { message: string }).message
        : String(err);
      set({ isLaunching: false, lastError: msg });
      useLogStore.getState().addLog({
        timestamp: Date.now(),
        level: 'ERROR',
        message: `Failed to launch scrcpy session: ${msg}`,
        raw: msg,
      });
      return null;
    }
  },

  stopSession: async (sessionId: string) => {
    try {
      const stopped = await invoke<boolean>('stop_scrcpy', { sessionId });
      if (!stopped) return;

      set((state) => {
        const current =
          state.sessions.find((session) => session.id === sessionId) ??
          state.history.find((session) => session.id === sessionId);
        if (!current) return state;

        return reconcileSessionState(state.sessions, state.history, {
          ...current,
          status: 'stopped',
          stoppedAt: Date.now(),
        });
      });
    } catch (e) {
      console.error('Failed to stop session:', e);
    }
  },

  fetchActiveSessions: async () => {
    try {
      const list = await invoke<ScrcpySession[]>('get_active_sessions');
      set((state) => {
        let nextSessions = state.sessions;
        let nextHistory = state.history;
        for (const session of list) {
          const reconciled = reconcileSessionState(nextSessions, nextHistory, session);
          nextSessions = reconciled.sessions;
          nextHistory = reconciled.history;
        }
        return { sessions: nextSessions, history: nextHistory };
      });
    } catch (e) {
      console.warn('Failed to fetch active sessions:', e);
    }
  },

  getGeneratedCommand: (executablePath = 'scrcpy') => {
    const activeSerial = useDeviceStore.getState().selectedSerial;
    const fullConfig = resolveSessionConfig(get().config, undefined, activeSerial, 'mirror');
    const args = buildScrcpyArgs(fullConfig);
    return formatCommandString(executablePath, args);
  },

  initEventListener: async () => {
    if (eventListenersPromise) {
      await eventListenersPromise;
      return;
    }

    eventListenersPromise = Promise.all([
      listen<ScrcpySession>('scrcpy:status', (event) => {
        set((state) => reconcileSessionState(state.sessions, state.history, event.payload));
      }),
      listen<{
        timestamp: number;
        sessionId?: string;
        level: string;
        message: string;
        raw: string;
      }>('scrcpy:log', (event) => {
        useLogStore.getState().addLog(event.payload);
      }),
    ]);

    try {
      await eventListenersPromise;
    } catch (error) {
      eventListenersPromise = null;
      console.error('Failed to initialize scrcpy event listeners:', error);
    }
  },
}));
