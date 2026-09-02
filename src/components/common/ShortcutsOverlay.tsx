import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { TranslationKey, useTranslation } from '@/lib/i18n';

interface ShortcutRow {
  keys: string[];
  labelKey: TranslationKey;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['Ctrl', 'K'], labelKey: 'shortcutCommandPalette' },
  { keys: ['Ctrl', 'R'], labelKey: 'shortcutRefreshDevices' },
  { keys: ['Ctrl', 'B'], labelKey: 'shortcutToggleSidebar' },
  { keys: ['Ctrl', 'Shift', 'M'], labelKey: 'shortcutStartMirroring' },
  { keys: ['Ctrl', 'Shift', 'R'], labelKey: 'shortcutRecordingStudio' },
  { keys: ['Ctrl', ','], labelKey: 'shortcutSettings' },
  { keys: ['?'], labelKey: 'shortcutShowOverlay' },
];

export const ShortcutsOverlay: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
        className="w-full max-w-md bg-surface border border-border-highlight rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-light text-primary border border-primary/20 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <h3 id="shortcuts-dialog-title" className="text-sm font-bold text-text-primary">{t('shortcutsTitle')}</h3>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
            title={t('shortcutsClose')}
            aria-label={t('shortcutsClose')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {SHORTCUTS.map((row) => (
            <div key={row.labelKey} className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{t(row.labelKey)}</span>
              <div className="flex items-center gap-1">
                {row.keys.map((key) => (
                  <kbd
                    key={key}
                    className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-[10px] font-mono font-semibold text-text-primary"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
