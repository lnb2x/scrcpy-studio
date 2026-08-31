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
} from 'lucide-react';
import { useUiStore } from '@/stores/useUiStore';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useTranslation } from '@/lib/i18n';

interface CommandItem {
  id: string;
  title: string;
  category: string;
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
      title: 'Go to Dashboard',
      category: 'Navigation',
      icon: Smartphone,
      action: () => setActiveTab('dashboard'),
    },
    {
      id: 'nav-devices',
      title: 'Go to Devices Manager',
      category: 'Navigation',
      icon: Smartphone,
      action: () => setActiveTab('devices'),
    },
    {
      id: 'nav-mirror',
      title: 'Go to Screen Mirror Setup',
      category: 'Navigation',
      icon: Cast,
      action: () => setActiveTab('mirror'),
    },
    {
      id: 'nav-camera',
      title: 'Go to Camera Stream',
      category: 'Navigation',
      icon: Camera,
      action: () => setActiveTab('camera'),
    },
    {
      id: 'nav-recording',
      title: 'Go to Recording Studio',
      category: 'Navigation',
      icon: Video,
      action: () => setActiveTab('recording'),
    },
    {
      id: 'nav-wireless',
      title: 'Go to Wireless Manager',
      category: 'Navigation',
      icon: Wifi,
      action: () => setActiveTab('wireless'),
    },
    {
      id: 'nav-profiles',
      title: 'Go to Profiles & Presets',
      category: 'Navigation',
      icon: Bookmark,
      action: () => setActiveTab('profiles'),
    },
    {
      id: 'nav-logs',
      title: 'Go to Diagnostics & Logs',
      category: 'Navigation',
      icon: Terminal,
      action: () => setActiveTab('logs'),
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      category: 'Navigation',
      icon: Settings,
      shortcut: 'Ctrl+,',
      action: () => setActiveTab('settings'),
    },

    // Quick Actions
    {
      id: 'act-mirror-start',
      title: 'Start Mirror on Active Device',
      category: 'Actions',
      icon: Cast,
      shortcut: 'Ctrl+Shift+M',
      action: () => startSession(),
    },
    {
      id: 'act-screen-off',
      title: 'Mirror with Screen Off',
      category: 'Actions',
      icon: Moon,
      action: () => startSession({ turnScreenOff: true }),
    },
    {
      id: 'act-audio-mirror',
      title: 'Mirror with Audio Forwarding',
      category: 'Actions',
      icon: Volume2,
      action: () => startSession({ audioEnabled: true }),
    },
    {
      id: 'act-refresh-devs',
      title: 'Refresh Connected Devices',
      category: 'Actions',
      icon: RefreshCw,
      shortcut: 'Ctrl+R',
      action: () => fetchDevices(),
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4 animate-fade-in">
      <div
        className="w-full max-w-xl bg-surface border border-border-highlight rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
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
              No matching actions found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
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
                    <span className="font-medium text-left">{cmd.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-surface text-text-muted'
                      }`}
                    >
                      {cmd.category}
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
