import React, { useCallback, useEffect, useState } from 'react';
import {
  Upload,
  Package,
  Camera,
  RotateCw,
  Search,
  FolderOpen,
  Power,
  Play,
  Trash2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import { toast } from 'sonner';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTranslation } from '@/lib/i18n';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatAppError } from '@/lib/errors';

export const AdbToolsPage: React.FC = () => {
  const { t, tf } = useTranslation();
  const { selectedDevice } = useDeviceStore();
  const { settings } = useSettingsStore();
  const selectedSerial = selectedDevice?.state === 'device' ? selectedDevice.serial : null;

  // File Transfer State
  const [localPushPath, setLocalPushPath] = useState('');
  const [remotePushPath, setRemotePushPath] = useState('/sdcard/Download/');
  const [isPushing, setIsPushing] = useState(false);

  // APK Install State
  const [apkPath, setApkPath] = useState('');
  const [reinstall, setReinstall] = useState(true);
  const [downgrade, setDowngrade] = useState(false);
  const [grantPerms, setGrantPerms] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  // Screenshot State
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [lastScreenshotPath, setLastScreenshotPath] = useState<string | null>(null);

  // App Launcher State
  const [packages, setPackages] = useState<string[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [pendingUninstall, setPendingUninstall] = useState<string | null>(null);

  // Reboot confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const fetchPackages = useCallback(async () => {
    if (!selectedSerial) return;
    setIsLoadingPackages(true);
    try {
      const list = await invoke<string[]>('adb_list_packages', {
        serial: selectedSerial,
        filter: '3rd-party',
      });
      setPackages(list);
    } catch (e) {
      console.warn('Failed to fetch packages:', e);
    } finally {
      setIsLoadingPackages(false);
    }
  }, [selectedSerial]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void fetchPackages(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchPackages]);

  const handleBrowsePushFile = async () => {
    try {
      const selected = await open({ multiple: false });
      if (selected && typeof selected === 'string') {
        setLocalPushPath(selected);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleBrowseApk = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: t('androidPackageFile'), extensions: ['apk'] }],
      });
      if (selected && typeof selected === 'string') {
        setApkPath(selected);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handlePushFile = async () => {
    if (!selectedSerial || !localPushPath.trim()) return;
    if (!remotePushPath.trim()) {
      toast.error(t('remoteDestinationRequired'));
      return;
    }
    setIsPushing(true);
    try {
      const res = await invoke<string>('adb_push_file', {
        serial: selectedSerial,
        localPath: localPushPath.trim(),
        remotePath: remotePushPath.trim(),
      });
      toast.success(tf('filePushed', { result: res }));
      setLocalPushPath('');
    } catch (e) {
      toast.error(`${t('pushFailed')}: ${formatAppError(e)}`);
    } finally {
      setIsPushing(false);
    }
  };

  const handleInstallApk = async () => {
    if (!selectedSerial || !apkPath.trim()) return;
    setIsInstalling(true);
    try {
      const res = await invoke<string>('adb_install_apk', {
        serial: selectedSerial,
        apkPath: apkPath.trim(),
        reinstall,
        downgrade,
        grantPermissions: grantPerms,
      });
      toast.success(tf('apkInstalled', { result: res }));
      setApkPath('');
      void fetchPackages();
    } catch (e) {
      toast.error(`${t('apkInstallFailed')}: ${formatAppError(e)}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleTakeScreenshot = async () => {
    if (!selectedSerial) return;
    setIsCapturingScreenshot(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot_${selectedSerial}_${timestamp}.png`;
      const targetDir = settings.screenshotsDir || 'C:\\';
      const fullPath = await join(targetDir, filename);

      await invoke<string>('adb_take_screenshot', {
        serial: selectedSerial,
        targetPath: fullPath,
      });

      setLastScreenshotPath(fullPath);
      toast.success(tf('screenshotSaved', { path: fullPath }));
    } catch (e) {
      toast.error(`${t('screenshotFailed')}: ${formatAppError(e)}`);
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleOpenScreenshotsFolder = async () => {
    try {
      await invoke('open_directory', { path: settings.screenshotsDir || 'C:\\' });
    } catch (error) {
      toast.error(`${t('openFolderFailed')}: ${formatAppError(error)}`);
    }
  };

  const triggerReboot = (mode?: string, title?: string) => {
    if (!selectedSerial) return;
    const serial = selectedSerial;
    const target = mode ? `${serial} (${mode})` : serial;
    setConfirmDialog({
      isOpen: true,
      title: title || t('rebootNormal'),
      message: tf('rebootConfirm', { target }),
      action: async () => {
        try {
          await invoke('adb_reboot_device', { serial, mode: mode || null });
          toast.success(tf('rebootSent', { serial }));
        } catch (e) {
          toast.error(`${t('rebootFailed')}: ${formatAppError(e)}`);
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleLaunchApp = async (pkg: string) => {
    if (!selectedSerial) return;
    try {
      await invoke('adb_launch_app', { serial: selectedSerial, package: pkg });
      toast.success(tf('appLaunched', { name: pkg }));
    } catch (e) {
      toast.error(`${t('launchAppFailed')}: ${formatAppError(e)}`);
    }
  };

  const handleUninstallApp = async () => {
    if (!selectedSerial || !pendingUninstall) return;
    try {
      await invoke('adb_uninstall_app', { serial: selectedSerial, package: pendingUninstall });
      toast.success(tf('appUninstalled', { name: pendingUninstall }));
      setPendingUninstall(null);
      void fetchPackages();
    } catch (e) {
      toast.error(`${t('uninstallAppFailed')}: ${formatAppError(e)}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {t('adbToolsTitle')}
        </h1>
        <p className="text-xs text-text-secondary mt-1">{t('adbToolsDescription')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. File Transfer (Push) */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-light text-primary border border-primary/20 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">{t('fileTransfer')}</h3>
              <p className="text-xs text-text-secondary">{t('pushFile')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary">{t('localFile')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localPushPath}
                  onChange={(e) => setLocalPushPath(e.target.value)}
                  placeholder={t('localFilePlaceholder')}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleBrowsePushFile}
                  className="px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs border border-border"
                >
                  {t('browse')}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary">
                {t('remoteDestination')}
              </label>
              <input
                type="text"
                value={remotePushPath}
                onChange={(e) => setRemotePushPath(e.target.value)}
                placeholder="/sdcard/Download/"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
              />
              <div className="flex gap-1 pt-1">
                {['/sdcard/Download/', '/sdcard/DCIM/', '/sdcard/Pictures/'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRemotePushPath(preset)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-muted hover:text-text-primary"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handlePushFile()}
              disabled={isPushing || !localPushPath.trim() || !selectedSerial}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-98 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isPushing ? t('pushingFile') : t('pushFile')}</span>
            </button>
          </div>
        </div>

        {/* 2. APK Installer */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-accent-subtle text-accent border border-accent/20 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">{t('apkInstaller')}</h3>
              <p className="text-xs text-text-secondary">{t('apkInstallerDescription')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary">{t('apkFile')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apkPath}
                  onChange={(e) => setApkPath(e.target.value)}
                  placeholder={t('apkFilePlaceholder')}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleBrowseApk}
                  className="px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs border border-border"
                >
                  {t('browse')}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={reinstall}
                  onChange={(e) => setReinstall(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <span>{t('reinstallExisting')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={grantPerms}
                  onChange={(e) => setGrantPerms(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <span>{t('grantPermissions')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={downgrade}
                  onChange={(e) => setDowngrade(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <span>{t('allowDowngrade')}</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => void handleInstallApk()}
              disabled={isInstalling || !apkPath.trim() || !selectedSerial}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-98 disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              <span>{isInstalling ? t('installingApk') : t('installApkBtn')}</span>
            </button>
          </div>
        </div>

        {/* 3. Screenshot Tool */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-surface-hover text-text-primary border border-border flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">{t('takeScreenshot')}</h3>
              <p className="text-xs text-text-secondary">{t('screenshotDescription')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleTakeScreenshot()}
              disabled={isCapturingScreenshot || !selectedSerial}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-hover hover:bg-surface-active text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{isCapturingScreenshot ? t('capturingScreenshot') : t('captureScreen')}</span>
            </button>

            {lastScreenshotPath && (
              <button
                type="button"
                onClick={() => void handleOpenScreenshotsFolder()}
                className="p-2.5 rounded-xl bg-surface-hover hover:bg-surface-active border border-border text-text-secondary hover:text-text-primary"
                title={t('openScreenshotsFolder')}
                aria-label={t('openScreenshotsFolder')}
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 4. Device Power & Reboot Commands */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-surface-hover text-text-primary border border-border flex items-center justify-center">
              <Power className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">{t('deviceCommands')}</h3>
              <p className="text-xs text-text-secondary">{t('rebootDescription')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => triggerReboot(undefined, t('rebootNormal'))}
              disabled={!selectedSerial}
              className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('rebootNormal')}
            </button>

            <button
              type="button"
              onClick={() => triggerReboot('recovery', t('rebootRecovery'))}
              disabled={!selectedSerial}
              className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('rebootRecovery')}
            </button>

            <button
              type="button"
              onClick={() => triggerReboot('bootloader', t('rebootBootloader'))}
              disabled={!selectedSerial}
              className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('rebootBootloader')}
            </button>

            <button
              type="button"
              onClick={() => triggerReboot('fastboot', t('rebootFastboot'))}
              disabled={!selectedSerial}
              className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('rebootFastboot')}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Installed Applications Browser */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-text-primary">{t('installedApps')}</h3>
            <p className="text-xs text-text-secondary">{t('installedAppsDescription')}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
              <input
                type="text"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder={t('searchApps')}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => void fetchPackages()}
              disabled={isLoadingPackages || !selectedSerial}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary"
              title={t('refreshApps')}
              aria-label={t('refreshApps')}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingPackages ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {packages.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted bg-surface rounded-xl border border-border">
            {isLoadingPackages ? t('loadingPackages') : t('noPackages')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {packages
              .filter((pkg) => pkg.toLowerCase().includes(appSearch.toLowerCase()))
              .map((pkg) => (
                <div
                  key={pkg}
                  className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between text-xs font-mono text-text-secondary group"
                >
                  <span className="truncate mr-2" title={pkg}>
                    {pkg}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleLaunchApp(pkg)}
                      className="p-1 rounded hover:bg-surface-active text-text-secondary hover:text-emerald-400 transition-colors"
                      title={t('launchApp')}
                      aria-label={`${t('launchApp')}: ${pkg}`}
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingUninstall(pkg)}
                      className="p-1 rounded hover:bg-surface-active text-text-secondary hover:text-rose-400 transition-colors"
                      title={t('uninstallApp')}
                      aria-label={`${t('uninstallApp')}: ${pkg}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Uninstall Confirmation */}
      <ConfirmDialog
        isOpen={!!pendingUninstall}
        title={t('uninstallApp')}
        message={pendingUninstall ? tf('uninstallAppConfirm', { name: pendingUninstall }) : ''}
        isDestructive={true}
        confirmText={t('uninstallApp')}
        onConfirm={handleUninstallApp}
        onCancel={() => setPendingUninstall(null)}
      />

      {/* Reboot Confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDestructive={true}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
