import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Cast,
  Camera,
  Video,
  Wifi,
  Smartphone,
  Bookmark,
  Terminal,
  Settings,
  Moon,
  Volume2,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { useUiStore } from '@/stores/useUiStore';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { type TranslationKey, useTranslation } from '@/lib/i18n';

interface CommandItem {
  id: string;
  titleKey: TranslationKey;
  categoryKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const { t } = useTranslation();
  const { isCommandPaletteOpen, setCommandPaletteOpen, setActiveTab } = useUiStore();
  const { fetchDevices } = useDeviceStore();
  const { startSession } = useScrcpyStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      const timeout = window.setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [isCommandPaletteOpen]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      titleKey: 'goToDashboard',
      categoryKey: 'navigationCategory',
      icon: Smartphone,
      action: () => setActiveTab('dashboard'),
    },
    {
      id: 'nav-devices',
      titleKey: 'goToDevices',
      categoryKey: 'navigationCategory',
      icon: Smartphone,
      action: () => setActiveTab('devices'),
    },
    {
      id: 'nav-mirror',
      titleKey: 'goToMirror',
      categoryKey: 'navigationCategory',
      icon: Cast,
      action: () => setActiveTab('mirror'),
    },
    {
      id: 'nav-camera',
      titleKey: 'goToCamera',
      categoryKey: 'navigationCategory',
      icon: Camera,
      action: () => setActiveTab('camera'),
    },
    {
      id: 'nav-recording',
      titleKey: 'goToRecording',
      categoryKey: 'navigationCategory',
      icon: Video,
      action: () => setActiveTab('recording'),
    },
    {
      id: 'nav-wireless',
      titleKey: 'goToWireless',
      categoryKey: 'navigationCategory',
      icon: Wifi,
      action: () => setActiveTab('wireless'),
    },
    {
      id: 'nav-files',
      titleKey: 'goToFiles',
      categoryKey: 'navigationCategory',
      icon: FolderOpen,
      action: () => setActiveTab('files'),
    },
    {
      id: 'nav-profiles',
      titleKey: 'goToProfiles',
      categoryKey: 'navigationCategory',
      icon: Bookmark,
      action: () => setActiveTab('profiles'),
    },
    {
      id: 'nav-logs',
      titleKey: 'goToLogs',
      categoryKey: 'navigationCategory',
      icon: Terminal,
      action: () => setActiveTab('logs'),
    },
    {
      id: 'nav-settings',
      titleKey: 'goToSettings',
      categoryKey: 'navigationCategory',
      icon: Settings,
      shortcut: 'Ctrl+,',
      action: () => setActiveTab('settings'),
    },

    // Quick Actions
    {
      id: 'act-mirror-start',
      titleKey: 'startMirrorActiveDevice',
      categoryKey: 'actionsCategory',
      icon: Cast,
      shortcut: 'Ctrl+Shift+M',
      action: () => void startSession(),
    },
    {
      id: 'act-screen-off',
      titleKey: 'mirrorWithScreenOff',
      categoryKey: 'actionsCategory',
      icon: Moon,
      action: () => void startSession({ turnScreenOff: true }),
    },
    {
      id: 'act-audio-mirror',
      titleKey: 'mirrorWithAudio',
      categoryKey: 'actionsCategory',
      icon: Volume2,
      action: () => void startSession({ audioEnabled: true }),
    },
    {
      id: 'act-refresh-devs',
      titleKey: 'refreshConnectedDevices',
      categoryKey: 'actionsCategory',
      icon: RefreshCw,
      shortcut: 'Ctrl+R',
      action: () => void fetchDevices(),
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      t(cmd.titleKey).toLowerCase().includes(query.toLowerCase()) ||
      t(cmd.categoryKey).toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (cmd: CommandItem) => {
    cmd.action();
    setCommandPaletteOpen(false);
  };

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-fade-in"
      onMouseDown={() => setCommandPaletteOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('commandPalette')}
        className="w-full max-w-xl bg-surface border border-border-highlight rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-border flex items-center gap-3">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyNavigation}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">
              {t('noMatchingActions')}
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  type="button"
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
                    <span className="font-medium text-left">{t(cmd.titleKey)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-surface text-text-muted'
                      }`}
                    >
                      {t(cmd.categoryKey)}
                    </span>

                    {cmd.shortcut && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? 'border-white/30 text-white'
                            : 'border-border text-text-muted'
                        }`}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
