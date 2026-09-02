import React, { useState, useEffect } from 'react';
import {
  Video,
  FolderOpen,
  Square,
  Radio,
  FileVideo,
  ExternalLink,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTranslation } from '@/lib/i18n';
import { CommandPreview } from '@/components/common/CommandPreview';
import { invoke } from '@tauri-apps/api/core';
import { formatAppError } from '@/lib/errors';

interface SavedRecording {
  name: string;
  path: string;
  date: string;
  size?: string;
}

export const RecordingPage: React.FC = () => {
  const { t } = useTranslation();
  const { config, startSession, sessions, history, stopSession } = useScrcpyStore();
  const { selectedDevice } = useDeviceStore();
  const { settings, updateSettings } = useSettingsStore();

  const [containerFormat, setContainerFormat] = useState<'mp4' | 'mkv'>(
    settings.defaultRecordFormat
  );
  const [filenameTemplate, setFilenameTemplate] = useState('{device}_{date}_{time}');
  const [noPlayback, setNoPlayback] = useState(false);
  const [recordOrientation, setRecordOrientation] = useState('0');
  const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [lastRecordingSessionId, setLastRecordingSessionId] = useState<string | null>(null);

  const activeRecording = sessions.find(
    (s) => s.mode === 'record' && s.status === 'running'
  );

  const [timerNow, setTimerNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeRecording) return;

    const interval = setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeRecording]);

  const failedRecording = history.find(
    (session) => session.id === lastRecordingSessionId && session.status === 'failed'
  );
  const displayedRecordingError =
    recordingError ?? (failedRecording ? failedRecording.errorMessage || t('recordingFailed') : null);

  const durationSec = activeRecording
    ? Math.max(0, Math.floor((timerNow - activeRecording.startedAt) / 1000))
    : 0;

  const handleBrowseDir = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        updateSettings({ recordingsDir: selected });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const generateTargetFilename = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
    const devName = (selectedDevice?.model || selectedDevice?.serial || 'device').replace(
      /\s+/g,
      '_'
    );

    const name = filenameTemplate
      .replaceAll('{device}', devName)
      .replaceAll('{date}', dateStr)
      .replaceAll('{time}', timeStr)
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/[. ]+$/g, '') || 'recording';

    const dir = (settings.recordingsDir || 'C:\\').replace(/[\\/]+$/g, '');
    return `${dir}\\${name}.${containerFormat}`;
  };

  const buildRecordingConfig = () => {
    const targetFile = generateTargetFilename();
    return {
      ...config,
      serial: selectedDevice?.serial,
      recordPath: targetFile,
      recordFormat: containerFormat,
      recordOrientation: recordOrientation !== '0' ? recordOrientation : undefined,
      noPlayback,
    };
  };

  const handleStartRecording = async () => {
    const fullConfig = buildRecordingConfig();
    setRecordingError(null);
    setLastRecordingSessionId(null);
    let targetFile: string;
    try {
      targetFile = await invoke<string>('prepare_recording_path', {
        path: fullConfig.recordPath,
      });
    } catch (error) {
      setRecordingError(formatAppError(error, 'RECORDING_FAILED'));
      return;
    }

    const session = await startSession({ ...fullConfig, recordPath: targetFile }, 'record');
    if (session) {
      setLastRecordingSessionId(session.id);
      setSavedRecordings((prev) => [
        {
          name: `${targetFile.split('\\').pop()}`,
          path: targetFile,
          date: new Date().toLocaleString(),
        },
        ...prev,
      ]);
    } else {
      setRecordingError(useScrcpyStore.getState().lastError ?? t('recordingFailed'));
    }
  };

  const handleOpenFolder = async (folderPath?: string) => {
    const target = folderPath || settings.recordingsDir;
    if (target) {
      try {
        await invoke('open_directory', { path: target });
      } catch (e) {
        setRecordingError(`${t('openFolderFailed')}: ${formatAppError(e)}`);
      }
    }
  };

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {t('recordingTitle')}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {t('recordingSubtext')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleOpenFolder()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>{t('openFolder')}</span>
        </button>
      </div>

      {/* Live Recording Active Banner */}
      {activeRecording && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-rose-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
              <Radio className="w-5 h-5 animate-pulse text-rose-500" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono font-bold text-rose-400 block tracking-wider">
                {t('recordingActive')}
              </span>
              <span className="text-2xl font-mono font-bold text-text-primary mt-0.5 block">
                {formatTimer(durationSec)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void stopSession(activeRecording.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all transform active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>{t('stopRecording')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Recording Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border space-y-6">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {t('recordingParameters')}
          </h3>

          {/* Directory Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary block">
              {t('outputDirectory')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={settings.recordingsDir || t('notConfigured')}
                className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono"
              />
              <button
                type="button"
                onClick={handleBrowseDir}
                className="px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-active border border-border text-text-secondary text-xs font-medium"
              >
                {t('browse')}
              </button>
            </div>
          </div>

          {/* Filename Template & Container Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                {t('fileNameTemplate')}
              </label>
              <input
                type="text"
                value={filenameTemplate}
                onChange={(e) => setFilenameTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
              />
              <span className="text-[10px] text-text-muted block">
                {t('fileNameTags')}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                {t('containerFormat')}
              </label>
              <div className="flex gap-2">
                {(['mp4', 'mkv'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setContainerFormat(fmt)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase border transition-all ${
                      containerFormat === fmt
                        ? 'bg-primary-light border-primary/50 text-primary'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-4 border-t border-border flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
              <input
                type="checkbox"
                checked={noPlayback}
                onChange={(e) => setNoPlayback(e.target.checked)}
                className="rounded text-primary focus:ring-0"
              />
              <span>{t('noPlaybackWhileRecording')}</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-text-primary">
                <span>{t('recordOrientation')}</span>
              <select
                value={recordOrientation}
                onChange={(e) => setRecordOrientation(e.target.value)}
                className="px-2 py-1 rounded-lg bg-surface border border-border text-xs font-mono"
              >
                <option value="0">0°</option>
                <option value="90">90°</option>
                <option value="180">180°</option>
                <option value="270">270°</option>
              </select>
            </label>
          </div>

          {/* Start Recording Button */}
          {!activeRecording && (
            <button
              type="button"
              onClick={() => void handleStartRecording()}
              disabled={!selectedDevice}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all transform active:scale-98 disabled:opacity-50"
            >
              <Video className="w-4 h-4" />
              <span>{t('startRecording')}</span>
            </button>
          )}
          {displayedRecordingError && (
            <p role="alert" className="text-xs text-rose-400">{displayedRecordingError}</p>
          )}
        </div>

        {/* Saved Recordings Card */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {t('savedRecordings')}
          </h3>

          {savedRecordings.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted rounded-xl bg-surface border border-border space-y-2">
              <FileVideo className="w-6 h-6 mx-auto text-text-muted" />
              <p>{t('noRecordingsThisSession')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {savedRecordings.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="font-semibold text-text-primary block truncate font-mono">
                      {rec.name}
                    </span>
                    <span className="text-[10px] text-text-muted">{rec.date}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleOpenFolder(settings.recordingsDir)}
                    className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary"
                    title={t('showInExplorer')}
                    aria-label={`${t('showInExplorer')}: ${rec.name}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CommandPreview
        onRun={handleStartRecording}
        previewConfig={buildRecordingConfig()}
        sessionMode="record"
      />
    </div>
  );
};
