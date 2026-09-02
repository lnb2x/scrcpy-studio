import React, { useState } from 'react';
import { Download, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useTranslation } from '@/lib/i18n';
import { formatAppError } from '@/lib/errors';

export const UpdateManager: React.FC = () => {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    setStatus(null);
    try {
      const configured = await invoke<boolean>('updater_configured');
      if (!configured) {
        setStatus(t('updaterNeedsSigningKey'));
        return;
      }
      const update = await check({ timeout: 30_000 });
      if (update) {
        setAvailableUpdate(update);
      } else {
        setStatus(t('upToDate'));
      }
    } catch (error) {
      setStatus(formatAppError(error, 'UPDATE_FAILED'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstall = async () => {
    if (!availableUpdate) return;
    setIsInstalling(true);
    setProgress(0);
    setStatus(null);
    let downloaded = 0;
    let contentLength = 0;
    try {
      await availableUpdate.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          setProgress(contentLength > 0 ? Math.min(100, (downloaded / contentLength) * 100) : null);
        } else if (event.event === 'Finished') {
          setProgress(100);
        }
      });
      setStatus(t('updateInstalledRestarting'));
      await relaunch();
    } catch (error) {
      setStatus(formatAppError(error, 'UPDATE_FAILED'));
      setIsInstalling(false);
    }
  };

  return (
    <>
      <section className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-light text-primary border border-primary/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">{t('applicationUpdates')}</h3>
              <p className="text-xs text-text-secondary">{t('applicationUpdatesDescription')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCheck()}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-active border border-border text-xs font-semibold text-text-secondary disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? t('checkingForUpdates') : t('checkForUpdates')}
          </button>
        </div>
        {status && <p role="status" className="text-xs text-text-secondary">{status}</p>}
      </section>

      {availableUpdate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="update-dialog-title" className="w-full max-w-md p-6 rounded-2xl bg-card border border-border-highlight shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="update-dialog-title" className="text-base font-bold text-text-primary">
                  {t('updateAvailable')} {availableUpdate.version}
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  {t('currentVersion')}: {availableUpdate.currentVersion}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAvailableUpdate(null)}
                disabled={isInstalling}
                aria-label={t('close')}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {availableUpdate.body && (
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-text-secondary rounded-xl bg-surface border border-border p-3">
                {availableUpdate.body}
              </p>
            )}

            {isInstalling && (
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-surface overflow-hidden border border-border">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress ?? 15}%` }} />
                </div>
                <p className="text-[11px] text-text-muted">
                  {progress === null ? t('downloadingUpdate') : `${Math.round(progress)}%`}
                </p>
              </div>
            )}

            {status && <p role="alert" className="text-xs text-rose-400">{status}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAvailableUpdate(null)}
                disabled={isInstalling}
                className="px-4 py-2 rounded-lg bg-surface-hover text-xs font-semibold text-text-secondary disabled:opacity-50"
              >
                {t('later')}
              </button>
              <button
                type="button"
                onClick={() => void handleInstall()}
                disabled={isInstalling}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {isInstalling ? t('installingUpdate') : t('downloadAndInstall')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
