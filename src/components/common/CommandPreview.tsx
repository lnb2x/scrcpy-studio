import React, { useState } from 'react';
import { Terminal, Copy, Check, Play, Square } from 'lucide-react';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { buildScrcpyArgs, formatCommandString } from '@/lib/commandBuilder';
import { useTranslation } from '@/lib/i18n';
import { ScrcpyConfig } from '@/types/scrcpy';

interface CommandPreviewProps {
  onRun?: () => void;
  className?: string;
  previewConfig?: ScrcpyConfig;
  sessionMode?: string;
}

export const CommandPreview: React.FC<CommandPreviewProps> = ({
  onRun,
  className = '',
  previewConfig,
  sessionMode = 'mirror',
}) => {
  const { t } = useTranslation();
  const { config, sessions, stopSession } = useScrcpyStore();
  const { selectedDevice } = useDeviceStore();
  const { settings } = useSettingsStore();
  const [copied, setCopied] = useState(false);

  const fullConfig = {
    ...(previewConfig ?? config),
    serial: previewConfig?.serial || selectedDevice?.serial || config.serial,
  };

  const args = buildScrcpyArgs(fullConfig);
  const exePath = settings.scrcpyPath || 'scrcpy.exe';
  const commandStr = formatCommandString(exePath, args);

  const activeSession = sessions.find(
    (session) =>
      session.deviceSerial === fullConfig.serial &&
      session.mode === sessionMode &&
      session.status === 'running'
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(commandStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  return (
    <div
      className={`rounded-2xl bg-card border border-border overflow-hidden transition-all duration-200 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="px-4 py-2.5 bg-surface/70 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-text-primary tracking-tight">
            {t('commandPreview')}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface text-text-muted border border-border">
            CLI
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors font-medium"
            title={t('copyCommand')}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">{t('copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">{t('copyCommand')}</span>
              </>
            )}
          </button>

          {onRun && (
            <div>
              {activeSession ? (
                <button
                  type="button"
                  onClick={() => stopSession(activeSession.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>{t('stop')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRun}
                  disabled={!selectedDevice}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{t('runCommand')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Terminal View Output */}
      <div className="p-3.5 bg-background font-mono text-xs overflow-x-auto text-emerald-400/95 leading-relaxed select-all">
        <span className="text-text-muted select-none mr-2">$</span>
        <span>{commandStr}</span>
      </div>
    </div>
  );
};
