import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Palette,
  Globe,
  HardDrive,
  Power,
  RotateCcw,
  Smartphone,
  Activity,
  Wrench,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTranslation } from '@/lib/i18n';
import { UpdateManager } from '@/components/common/UpdateManager';
import { formatAppError } from '@/lib/errors';

export const SettingsPage: React.FC = () => {
  const { t, tf } = useTranslation();
  const {
    settings,
    updateSettings,
    detection,
    diagnostics,
    isDetecting,
    isRepairing,
    runtimeError,
    detectExecutables,
    checkRuntime,
    testRuntime,
    repairRuntime,
    setCustomScrcpyPath,
    setCustomAdbPath,
  } = useSettingsStore();

  const [adbServerStatus, setAdbServerStatus] = useState<string | null>(null);

  const handleBrowseScrcpy = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: t('executableFile'), extensions: ['exe'] }],
      });
      if (selected && typeof selected === 'string') {
        await setCustomScrcpyPath(selected);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleBrowseAdb = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: t('executableFile'), extensions: ['exe'] }],
      });
      if (selected && typeof selected === 'string') {
        await setCustomAdbPath(selected);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleBrowseFolder = async (key: 'recordingsDir' | 'screenshotsDir') => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        updateSettings({ [key]: selected });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRestartAdb = async () => {
    setAdbServerStatus(t('restartingAdb'));
    try {
      await invoke('adb_kill_server');
      await invoke('adb_start_server');
      setAdbServerStatus(t('adbRestarted'));
    } catch (e) {
      setAdbServerStatus(`${t('adbRestartFailed')}: ${formatAppError(e)}`);
    }
  };

  const handleKillAdb = async () => {
    setAdbServerStatus(t('killingAdb'));
    try {
      await invoke('adb_kill_server');
      setAdbServerStatus(t('adbKilled'));
    } catch (e) {
      setAdbServerStatus(`${t('adbKillFailed')}: ${formatAppError(e)}`);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {t('settingsTitle')}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {t('settingsDescription')}
        </p>
      </div>

      {/* 1. Executables Section */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">{t('executablesToolchains')}</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('executablePathsDescription')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => void checkRuntime()}
              disabled={isDetecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t('checkRuntime')}</span>
            </button>
            <button
              type="button"
              onClick={() => void repairRuntime()}
              disabled={isRepairing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
            >
              <Wrench className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
              <span>{isRepairing ? t('repairingRuntime') : t('repairRuntime')}</span>
            </button>
            <button
              type="button"
              onClick={() => void detectExecutables()}
              disabled={isDetecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isDetecting ? t('scanningRuntime') : t('autoDetect')}</span>
            </button>
          </div>
        </div>

        {runtimeError && (
          <p role="alert" className="text-xs text-rose-400 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
            {runtimeError}
          </p>
        )}

        {/* scrcpy Executable */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <span>{t('scrcpyPath')}</span>
              {detection?.isScrcpyReady ? (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> {t('stateReady')} ({detection.scrcpyVersion || '4.1'})
                </span>
              ) : (
                <span className="text-[10px] text-rose-400 font-mono flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" /> {t('notFound')}
                </span>
              )}
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={settings.scrcpyPath}
              onChange={(e) => updateSettings({ scrcpyPath: e.target.value })}
              onBlur={(e) => void setCustomScrcpyPath(e.currentTarget.value)}
              placeholder="C:\path\to\scrcpy.exe"
              className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => void testRuntime('scrcpy')}
              className="px-3.5 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs font-medium border border-border"
            >
              {t('testExecutable')}
            </button>
            <button
              type="button"
              onClick={handleBrowseScrcpy}
              className="px-3.5 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs font-medium border border-border"
            >
              {t('browse')}
            </button>
          </div>
        </div>

        {/* ADB Executable */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <span>{t('adbPath')}</span>
              {detection?.isAdbReady ? (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> {t('stateReady')} ({detection.adbVersion || '1.0.41'})
                </span>
              ) : (
                <span className="text-[10px] text-rose-400 font-mono flex items-center gap-0.5">
                  <XCircle className="w-3 h-3" /> {t('notFound')}
                </span>
              )}
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={settings.adbPath}
              onChange={(e) => updateSettings({ adbPath: e.target.value })}
              onBlur={(e) => void setCustomAdbPath(e.currentTarget.value)}
              placeholder="C:\path\to\adb.exe"
              className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => void testRuntime('adb')}
              className="px-3.5 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs font-medium border border-border"
            >
              {t('testExecutable')}
            </button>
            <button
              type="button"
              onClick={handleBrowseAdb}
              className="px-3.5 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs font-medium border border-border"
            >
              {t('browse')}
            </button>
          </div>
        </div>

        {diagnostics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
            <div className="p-3 rounded-xl bg-surface border border-border">
              <span className="text-[10px] uppercase tracking-wider text-text-muted">scrcpy</span>
              <p className="text-xs text-text-primary font-semibold mt-1">
                {diagnostics.scrcpy.version ?? t('versionUnknown')} · {diagnostics.scrcpy.status}
              </p>
              <p className="text-[10px] text-text-muted mt-1 break-all">
                {diagnostics.scrcpy.status === 'ready'
                  ? tf('runtimeReadyMessage', { name: 'scrcpy' })
                  : diagnostics.scrcpy.status === 'missing'
                    ? tf('runtimeMissingMessage', { name: 'scrcpy' })
                    : diagnostics.scrcpy.message}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border">
              <span className="text-[10px] uppercase tracking-wider text-text-muted">ADB</span>
              <p className="text-xs text-text-primary font-semibold mt-1">
                {diagnostics.adb.version ?? t('versionUnknown')} · {diagnostics.adb.status}
              </p>
              <p className="text-[10px] text-text-muted mt-1 break-all">
                {diagnostics.adb.status === 'ready'
                  ? tf('runtimeReadyMessage', { name: 'ADB' })
                  : diagnostics.adb.status === 'missing'
                    ? tf('runtimeMissingMessage', { name: 'ADB' })
                    : diagnostics.adb.message}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface border border-border">
              <span className="text-[10px] uppercase tracking-wider text-text-muted">{t('androidDevice')}</span>
              <p className="text-xs text-text-primary font-semibold mt-1">
                {diagnostics.deviceCount > 0
                  ? `${diagnostics.deviceCount} ${t('devicesDetected')}`
                  : t('noDeviceConnected')}
              </p>
              <p className="text-[10px] text-text-muted mt-1 break-all">
                {diagnostics.deviceStates.join(', ') || t('connectDeviceDiagnostic')}
              </p>
            </div>
          </div>
        )}

        {/* ADB Server Quick Actions */}
        <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-text-muted">
            {adbServerStatus || t('adbDaemonManagement')}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRestartAdb()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary text-xs font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('restartAdbServer')}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleKillAdb()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-muted hover:text-rose-400 text-xs font-medium"
            >
              <Power className="w-3 h-3" />
              <span>{t('killAdbServer')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Appearance & Theme */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-light text-primary border border-primary/20 flex items-center justify-center">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{t('appearance')}</h3>
            <p className="text-xs text-text-secondary">{t('appearanceDescription')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Theme Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary block">{t('theme')}</label>
            <div className="flex gap-2">
              {(
                [
                  { id: 'dark', labelKey: 'themeDark' },
                  { id: 'light', labelKey: 'themeLight' },
                  { id: 'system', labelKey: 'themeSystem' },
                ] as const
              ).map((themeOption) => (
                <button
                  type="button"
                  key={themeOption.id}
                  onClick={() => updateSettings({ theme: themeOption.id })}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    settings.theme === themeOption.id
                      ? 'bg-primary-light border-primary/50 text-primary font-bold'
                      : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                  }`}
                >
                  {t(themeOption.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary block">
              {t('accentColor')}
            </label>
            <div className="flex gap-2">
              {(
                [
                  { id: 'blue', color: '#3b82f6', labelKey: 'accentBlue' },
                  { id: 'violet', color: '#8b5cf6', labelKey: 'accentViolet' },
                  { id: 'cyan', color: '#06b6d4', labelKey: 'accentCyan' },
                  { id: 'emerald', color: '#10b981', labelKey: 'accentEmerald' },
                ] as const
              ).map((acc) => (
                <button
                  type="button"
                  key={acc.id}
                  onClick={() => updateSettings({ accentColor: acc.id })}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    settings.accentColor === acc.id
                      ? 'bg-surface border-primary ring-1 ring-primary/40 text-text-primary font-bold'
                      : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color }}
                  />
                  <span>{t(acc.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Language & Localization */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-surface-hover text-text-primary border border-border flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{t('language')}</h3>
            <p className="text-xs text-text-secondary">{t('languageDescription')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateSettings({ language: 'en' })}
            className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all ${
              settings.language === 'en'
                ? 'bg-primary-light border-primary/50 text-primary'
                : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
            }`}
          >
            English (United States)
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ language: 'vi' })}
            className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition-all ${
              settings.language === 'vi'
                ? 'bg-primary-light border-primary/50 text-primary'
                : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
            }`}
          >
            Tiếng Việt (Vietnamese)
          </button>
        </div>
      </div>

      {/* 4. Storage Directories */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-surface-hover text-text-primary border border-border flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{t('storageDirectories')}</h3>
            <p className="text-xs text-text-secondary">{t('storageDirectoriesDescription')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              {t('outputDirectory')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={settings.recordingsDir}
                className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono"
              />
              <button
                type="button"
                onClick={() => void handleBrowseFolder('recordingsDir')}
                className="px-3.5 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs font-medium border border-border"
              >
                {t('browse')}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">{t('screenshotsFolder')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={settings.screenshotsDir}
                className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono"
              />
              <button
                type="button"
                onClick={() => void handleBrowseFolder('screenshotsDir')}
                className="px-3.5 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs font-medium border border-border"
              >
                {t('browse')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <UpdateManager />

      {/* 5. About & Credits */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Scrcpy Studio</h3>
              <p className="text-xs text-text-secondary">
                {tf('appVersionTarget', { version: '0.1.0', scrcpyVersion: '4.1' })}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono px-2 py-1 rounded bg-surface border border-border text-text-muted">
            Tauri 2 • Rust • React
          </span>
        </div>

        <p className="text-xs text-text-muted leading-relaxed pt-2 border-t border-border">
          {t('poweredBy')}. {t('creditsNotice')}
        </p>
      </div>
    </div>
  );
};
