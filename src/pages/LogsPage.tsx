import React, { useRef, useEffect, useState } from 'react';
import {
  Search,
  Copy,
  Check,
  Trash2,
  Download,
  ArrowDown,
} from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useLogStore } from '@/stores/useLogStore';
import { useTranslation } from '@/lib/i18n';

export const LogsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    filterLevel,
    setFilterLevel,
    searchQuery,
    setSearchQuery,
    autoScroll,
    setAutoScroll,
    clearLogs,
    getFilteredLogs,
  } = useLogStore();

  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const filteredLogs = getFilteredLogs();

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleCopyAll = async () => {
    try {
      const text = filteredLogs
        .map(
          (l) =>
            `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.source ?? 'APP'}] [${l.level}] ${l.message}`
        )
        .join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy logs failed:', e);
    }
  };

  const handleExport = async () => {
    try {
      const targetPath = await save({
        filters: [{ name: t('logFile'), extensions: ['txt', 'log'] }],
        defaultPath: `scrcpy-studio-logs-${new Date().toISOString().slice(0, 10)}.log`,
      });

      if (targetPath) {
        const text = filteredLogs
          .map(
            (l) =>
              `[${new Date(l.timestamp).toISOString()}] [${l.source ?? 'APP'}] [${l.level}] ${l.message}`
          )
          .join('\n');
        await writeTextFile(targetPath, text);
      }
    } catch (e) {
      console.warn('Export logs failed:', e);
    }
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'text-rose-400 bg-rose-500/15 border-rose-500/20';
      case 'WARN':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/20';
      case 'DEBUG':
        return 'text-primary bg-primary-light border-primary/20';
      default:
        return 'text-text-muted bg-surface-hover border-border';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in flex flex-col h-[calc(100vh-2.5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {t('logsTitle')}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {t('logsDescription')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyAll()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t('copyLogs')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void handleExport()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportLogs')}</span>
          </button>

          <button
            type="button"
            onClick={clearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-text-muted hover:text-rose-400 text-xs font-semibold border border-border transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clearLogs')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
            <button
              type="button"
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                filterLevel === lvl
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface hover:bg-surface-hover text-text-secondary border border-border'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchLogs')}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
              autoScroll
                ? 'bg-primary-light border-primary/40 text-primary'
                : 'bg-surface text-text-muted border-border'
            }`}
            title={t('toggleAutoScroll')}
          >
            <ArrowDown className="w-3 h-3" />
            <span>{t('scroll')}</span>
          </button>
        </div>
      </div>

      {/* Terminal View Panel */}
      <div
        ref={logContainerRef}
        className="flex-1 bg-background rounded-2xl border border-border p-4 font-mono text-xs overflow-y-auto space-y-1 select-text shadow-inner"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted">
            {t('noMatchingLogs')}
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2.5 hover:bg-surface/50 py-0.5 px-1.5 rounded">
              <span className="text-text-muted shrink-0 select-none">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>

              <span
                className={`px-1.5 py-0.2 text-[10px] font-bold rounded border shrink-0 uppercase select-none ${getLevelBadgeClass(
                  log.level
                )}`}
              >
                {log.level}
              </span>

              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded border border-border bg-surface-hover text-cyan-300 shrink-0 uppercase select-none">
                {log.source ?? 'APP'}
              </span>

              <span
                className={`break-all leading-relaxed ${
                  log.level === 'ERROR'
                    ? 'text-rose-400 font-semibold'
                    : log.level === 'WARN'
                    ? 'text-amber-300'
                    : log.level === 'DEBUG'
                    ? 'text-cyan-300'
                    : 'text-text-secondary'
                }`}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
