import React, { useCallback, useEffect, useState } from 'react';
import {
  Upload,
  Package,
  Camera,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Power,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { openPath } from '@tauri-apps/plugin-opener';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTranslation } from '@/lib/i18n';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export const AdbToolsPage: React.FC = () => {
  const { t } = useTranslation();
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

  // Status & Confirm Dialog State
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
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
        filters: [{ name: 'Android Package', extensions: ['apk'] }],
      });
      if (selected && typeof selected === 'string') {
        setApkPath(selected);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handlePushFile = async () => {
    if (!selectedDevice || !localPushPath.trim()) return;
    setIsPushing(true);
    setStatusMessage(null);
    try {
      const res = await invoke<string>('adb_push_file', {
        serial: selectedDevice.serial,
        localPath: localPushPath.trim(),
        remotePath: remotePushPath.trim(),
      });
      setStatusMessage({ text: `File pushed successfully! ${res}`, isError: false });
      setLocalPushPath('');
    } catch (e) {
      setStatusMessage({ text: `Failed to push file: ${String(e)}`, isError: true });
    } finally {
      setIsPushing(false);
    }
  };

  const handleInstallApk = async () => {
    if (!selectedDevice || !apkPath.trim()) return;
    setIsInstalling(true);
    setStatusMessage(null);
    try {
      const res = await invoke<string>('adb_install_apk', {
        serial: selectedDevice.serial,
        apkPath: apkPath.trim(),
        reinstall,
        downgrade,
        grantPermissions: grantPerms,
      });
      setStatusMessage({ text: `APK Installed Successfully! ${res}`, isError: false });
      setApkPath('');
      fetchPackages();
    } catch (e) {
      setStatusMessage({ text: `Installation failed: ${String(e)}`, isError: true });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleTakeScreenshot = async () => {
    if (!selectedDevice) return;
    setIsCapturingScreenshot(true);
    setStatusMessage(null);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot_${selectedDevice.serial}_${timestamp}.png`;
      const targetDir = settings.screenshotsDir || 'C:\\';
      const fullPath = `${targetDir}\\${filename}`;

      await invoke<string>('adb_take_screenshot', {
        serial: selectedDevice.serial,
        targetPath: fullPath,
      });

      setLastScreenshotPath(fullPath);
      setStatusMessage({ text: `Screenshot saved to ${fullPath}`, isError: false });
    } catch (e) {
      setStatusMessage({ text: `Failed to capture screenshot: ${String(e)}`, isError: true });
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const triggerReboot = (mode?: string, title?: string) => {
    if (!selectedDevice) return;
    setConfirmDialog({
      isOpen: true,
      title: title || t('rebootNormal'),
      message: `Are you sure you want to reboot ${selectedDevice.serial}${
        mode ? ` into ${mode}` : ''
      }? This will disconnect active sessions.`,
      action: async () => {
        try {
          await invoke('adb_reboot_device', {
            serial: selectedDevice.serial,
            mode: mode || null,
          });
          setStatusMessage({ text: `Reboot command sent to ${selectedDevice.serial}`, isError: false });
        } catch (e) {
          setStatusMessage({ text: `Reboot failed: ${String(e)}`, isError: true });
        }
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {t('adbToolsTitle')}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Perform file transfer, APK installations, screen captures, and direct device system actions.
        </p>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs leading-relaxed ${
            statusMessage.isError
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

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
              <label className="text-[11px] font-semibold text-text-secondary">Local File</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localPushPath}
                  onChange={(e) => setLocalPushPath(e.target.value)}
                  placeholder="Select or enter local file path..."
                  className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleBrowsePushFile}
                  className="px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs border border-border"
                >
                  Browse
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary">Remote Destination</label>
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
              onClick={handlePushFile}
              disabled={isPushing || !localPushPath.trim() || !selectedDevice}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-98 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isPushing ? 'Pushing...' : 'Push File to Device'}</span>
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
              <p className="text-xs text-text-secondary">Direct install APK on connected device</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-text-secondary">APK File</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apkPath}
                  onChange={(e) => setApkPath(e.target.value)}
                  placeholder="Select .apk file..."
                  className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleBrowseApk}
                  className="px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs border border-border"
                >
                  Browse
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
              onClick={handleInstallApk}
              disabled={isInstalling || !apkPath.trim() || !selectedDevice}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-98 disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              <span>{isInstalling ? 'Installing...' : t('installApkBtn')}</span>
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
              <p className="text-xs text-text-secondary">
                Direct lossless framebuffer capture to Pictures folder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTakeScreenshot}
              disabled={isCapturingScreenshot || !selectedDevice}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-hover hover:bg-surface-active text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{isCapturingScreenshot ? 'Capturing...' : 'Capture Screen'}</span>
            </button>

            {lastScreenshotPath && (
              <button
                onClick={() => openPath(settings.screenshotsDir || 'C:\\')}
                className="p-2.5 rounded-xl bg-surface-hover hover:bg-surface-active border border-border text-text-secondary hover:text-text-primary"
                title="Open Screenshots Folder"
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
              <p className="text-xs text-text-secondary">System reboot actions with confirmation</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => triggerReboot(undefined, t('rebootNormal'))}
              disabled={!selectedDevice}
              className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('rebootNormal')}
            </button>

            <button
              onClick={() => triggerReboot('recovery', t('rebootRecovery'))}
              disabled={!selectedDevice}
              className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('rebootRecovery')}
            </button>

            <button
              onClick={() => triggerReboot('bootloader', t('rebootBootloader'))}
              disabled={!selectedDevice}
              className="py-2 px-3 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              {t('rebootBootloader')}
            </button>

            <button
              onClick={() => triggerReboot('fastboot', t('rebootFastboot'))}
              disabled={!selectedDevice}
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
            <p className="text-xs text-text-secondary">Probed 3rd-party Android application packages</p>
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
              onClick={fetchPackages}
              disabled={isLoadingPackages || !selectedDevice}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary"
              title="Refresh Apps"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingPackages ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {packages.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-muted bg-surface rounded-xl border border-border">
            {isLoadingPackages ? 'Loading packages from device...' : 'No packages detected.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {packages
              .filter((pkg) => pkg.toLowerCase().includes(appSearch.toLowerCase()))
              .map((pkg) => (
                <div
                  key={pkg}
                  className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between text-xs font-mono text-text-secondary"
                >
                  <span className="truncate mr-2" title={pkg}>
                    {pkg}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
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
