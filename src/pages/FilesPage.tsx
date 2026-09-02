import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  HardDrive,
  Loader2,
  Package,
  RefreshCw,
  Trash2,
  Download,
  AlertCircle,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTranslation } from '@/lib/i18n';
import { RemoteFileEntry } from '@/types/file';
import { formatBytes, isNavigable, joinRemotePath, sortRemoteEntries } from '@/lib/fileUtils';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatAppError } from '@/lib/errors';

const QUICK_LOCATIONS = [
  { label: '/sdcard', path: '/sdcard' },
  { label: 'Download', path: '/sdcard/Download' },
  { label: 'DCIM', path: '/sdcard/DCIM' },
  { label: 'Documents', path: '/sdcard/Documents' },
];

function fileIcon(entry: RemoteFileEntry) {
  if (entry.isDir) return Folder;
  const lower = entry.name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|heic)$/.test(lower)) return FileImage;
  if (/\.(mp4|mkv|avi|mov|webm)$/.test(lower)) return FileVideo;
  if (/\.(mp3|wav|ogg|flac|m4a|opus|aac)$/.test(lower)) return FileAudio;
  if (/\.(zip|rar|7z|tar|gz)$/.test(lower)) return FileArchive;
  if (/\.(apk|apks|xapk)$/.test(lower)) return Package;
  if (/\.(json|xml|html|js|ts|py|sh|log)$/.test(lower)) return FileCode;
  if (/\.(txt|md|pdf|doc|csv)$/.test(lower)) return FileText;
  return File;
}

export const FilesPage: React.FC = () => {
  const { t, tf } = useTranslation();
  const { selectedDevice, selectedSerial } = useDeviceStore();
  const { settings } = useSettingsStore();
  const authorized = selectedDevice?.state === 'device' && !!selectedSerial;

  const [path, setPath] = useState('/sdcard');
  const [entries, setEntries] = useState<RemoteFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<RemoteFileEntry | null>(null);
  const [isPulling, setIsPulling] = useState<string | null>(null);

  const breadcrumbs = useMemo(
    () =>
      path
        .split('/')
        .filter(Boolean)
        .map((segment, index, all) => ({
          segment,
          target: `/${all.slice(0, index + 1).join('/')}`,
        })),
    [path]
  );

  const loadDirectory = useCallback(
    async (target: string, silent = false) => {
      if (!authorized || !selectedSerial) return;
      if (silent) setIsRefreshing(true);
      else {
        setIsLoading(true);
        setLoadError(null);
      }
      try {
        const list = await invoke<RemoteFileEntry[]>('adb_list_directory', {
          serial: selectedSerial,
          path: target,
        });
        setEntries(sortRemoteEntries(list));
        setPath(target);
      } catch (e) {
        setLoadError(formatAppError(e));
        setEntries([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authorized, selectedSerial]
  );

  useEffect(() => {
    // Defer to avoid a synchronous setState inside the effect body.
    const timeout = window.setTimeout(() => void loadDirectory('/sdcard'), 0);
    return () => window.clearTimeout(timeout);
  }, [authorized, loadDirectory]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !selectedSerial) return;
    setIsCreatingFolder(true);
    try {
      await invoke('adb_make_directory', {
        serial: selectedSerial,
        path: joinRemotePath(path, name),
      });
      toast.success(tf('folderCreated', { name }));
      setIsNewFolderOpen(false);
      setNewFolderName('');
      void loadDirectory(path, true);
    } catch (e) {
      toast.error(`${t('folderCreateFailed')}: ${formatAppError(e)}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || !selectedSerial) return;
    try {
      await invoke('adb_delete_path', {
        serial: selectedSerial,
        path: joinRemotePath(path, pendingDelete.name),
        recursive: pendingDelete.isDir,
      });
      toast.success(tf('entryDeleted', { name: pendingDelete.name }));
      setPendingDelete(null);
      void loadDirectory(path, true);
    } catch (e) {
      toast.error(`${t('entryDeleteFailed')}: ${formatAppError(e)}`);
    }
  };

  const handlePull = async (entry: RemoteFileEntry) => {
    if (!selectedSerial || entry.isDir) return;
    const defaultPath = await join(settings.recordingsDir || 'C:\\', entry.name);
    const target = await save({
      defaultPath,
      filters: [{ name: t('allFiles'), extensions: ['*'] }],
    });
    if (!target) return;

    setIsPulling(entry.name);
    try {
      await invoke('adb_pull_file', {
        serial: selectedSerial,
        remotePath: joinRemotePath(path, entry.name),
        localPath: target,
      });
      toast.success(tf('pullDone', { path: target }));
    } catch (e) {
      toast.error(`${t('pullFailed')}: ${formatAppError(e)}`);
    } finally {
      setIsPulling(null);
    }
  };

  const deleteMessage = pendingDelete
    ? pendingDelete.isDir
      ? tf('deleteFolderWarn', { name: pendingDelete.name })
      : tf('deleteEntryConfirm', { name: pendingDelete.name })
    : '';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">{t('filesTitle')}</h1>
          <p className="text-xs text-text-secondary mt-1">{t('filesSubtext')}</p>
        </div>

        {authorized && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewFolderOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{t('newFolder')}</span>
            </button>
            <button
              type="button"
              onClick={() => void loadDirectory(path, true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-surface-hover hover:bg-surface-active border border-border text-text-secondary hover:text-text-primary transition-all disabled:opacity-50"
              title={t('refreshFolder')}
              aria-label={t('refreshFolder')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {!authorized ? (
        <div className="p-10 rounded-2xl bg-card border border-border flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-text-muted">
            <HardDrive className="w-6 h-6" />
          </div>
          <p className="text-xs text-text-secondary max-w-sm leading-relaxed">{t('filesNoDevice')}</p>
        </div>
      ) : (
        <>
          {/* Inline New Folder input */}
          {isNewFolderOpen && (
            <div className="p-4 rounded-2xl bg-card border border-primary/30 space-y-3 animate-slide-up">
              <label className="text-[11px] font-semibold text-text-secondary">
                {t('folderName')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleCreateFolder();
                    if (e.key === 'Escape') setIsNewFolderOpen(false);
                  }}
                  placeholder={t('folderNamePlaceholder')}
                  className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateFolder()}
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isCreatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('create')}
                </button>
              </div>
            </div>
          )}

          {/* Breadcrumb & Quick Locations */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-1 px-3.5 py-2 rounded-xl bg-card border border-border overflow-x-auto">
              <button
                type="button"
                onClick={() => void loadDirectory('/')}
                className="text-xs font-semibold text-text-secondary hover:text-primary shrink-0"
              >
                /
              </button>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={crumb.target}>
                  <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                  <button
                    type="button"
                    onClick={() => void loadDirectory(crumb.target)}
                    className={`text-xs shrink-0 hover:text-primary ${
                      i === breadcrumbs.length - 1
                        ? 'text-text-primary font-semibold'
                        : 'text-text-secondary'
                    }`}
                  >
                    {crumb.segment}
                  </button>
                </React.Fragment>
              ))}
              {isLoading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin ml-2 shrink-0" />}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {QUICK_LOCATIONS.map((loc) => (
                <button
                  type="button"
                  key={loc.path}
                  onClick={() => void loadDirectory(loc.path)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-colors ${
                    path === loc.path
                      ? 'bg-primary-light border-primary/30 text-primary'
                      : 'bg-surface border-border text-text-muted hover:text-text-primary'
                  }`}
                >
                  {loc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error banner */}
          {loadError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {t('loadFailed')}: {loadError}
              </span>
            </div>
          )}

          {/* File listing */}
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            {isLoading ? (
              <div className="p-10 flex items-center justify-center gap-2 text-xs text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>...</span>
              </div>
            ) : entries.length === 0 && !loadError ? (
              <div className="p-10 text-center text-xs text-text-muted">{t('emptyFolder')}</div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-border-subtle flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    {tf('itemsCount', { n: entries.length })}
                  </span>
                </div>
                <div className="max-h-[calc(100vh-420px)] min-h-[200px] overflow-y-auto">
                  {entries.map((entry) => {
                    const Icon = fileIcon(entry);
                    const navigable = isNavigable(entry);

                    return (
                      <div
                        key={entry.name}
                        className="group px-4 py-2.5 border-b border-border-subtle last:border-b-0 flex items-center gap-3 hover:bg-surface-hover transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (navigable) void loadDirectory(joinRemotePath(path, entry.name));
                          }}
                          disabled={!navigable}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              entry.isDir ? 'text-primary' : 'text-text-muted'
                            }`}
                          />
                          <span className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-text-primary truncate">
                              {entry.name}
                            </span>
                            <span className="text-[10px] text-text-muted font-mono">
                              {entry.isDir ? '—' : formatBytes(entry.size)}
                              {entry.modified && ` • ${entry.modified}`}
                            </span>
                          </span>
                        </button>

                        <span className="hidden sm:block text-[10px] font-mono text-text-muted shrink-0">
                          {entry.permissions}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {!entry.isDir && (
                            <button
                              type="button"
                              onClick={() => void handlePull(entry)}
                              disabled={isPulling === entry.name}
                              className="p-1.5 rounded-lg hover:bg-surface-active text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
                              title={t('pullEntry')}
                              aria-label={`${t('pullEntry')}: ${entry.name}`}
                            >
                              {isPulling === entry.name ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingDelete(entry)}
                            className="p-1.5 rounded-lg hover:bg-surface-active text-text-secondary hover:text-rose-400 transition-colors"
                            title={t('deleteEntry')}
                            aria-label={`${t('deleteEntry')}: ${entry.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={t('deleteEntry')}
        message={deleteMessage}
        isDestructive={true}
        confirmText={t('deleteEntry')}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
