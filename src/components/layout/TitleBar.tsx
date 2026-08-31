import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, Copy, X, Smartphone, Command } from 'lucide-react';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useUiStore } from '@/stores/useUiStore';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { selectedSerial, devices } = useDeviceStore();
  const { setCommandPaletteOpen } = useUiStore();

  const currentDevice = devices.find((d) => d.serial === selectedSerial);

  useEffect(() => {
    try {
      const appWindow = getCurrentWindow();
      appWindow.isMaximized().then(setIsMaximized).catch(() => {});
    } catch {
      // Ignore if not in Tauri webview
    }
  }, []);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_minimize');
    } catch {
      try {
        await getCurrentWindow().minimize();
      } catch (err) {
        console.warn('Minimize error:', err);
      }
    }
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isMax = await invoke<boolean>('app_toggle_maximize');
      setIsMaximized(isMax);
    } catch {
      try {
        const appWindow = getCurrentWindow();
        await appWindow.toggleMaximize();
        const max = await appWindow.isMaximized();
        setIsMaximized(max);
      } catch (err) {
        console.warn('Maximize error:', err);
      }
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_close');
    } catch {
      try {
        await getCurrentWindow().close();
      } catch (err) {
        console.warn('Close error:', err);
      }
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-10 w-full bg-surface/90 backdrop-blur-md border-b border-border flex items-center justify-between px-3 select-none z-50 shrink-0"
    >
      {/* App Branding */}
      <div className="flex items-center gap-2.5 pointer-events-none" data-tauri-drag-region>
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-sm">
          <Smartphone className="w-3 h-3" />
        </div>
        <span className="font-semibold text-xs text-text-primary tracking-tight">
          Scrcpy Studio
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-hover text-text-muted border border-border">
          4.1
        </span>
      </div>

      {/* Quick Search / Command Palette shortcut in titlebar */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {currentDevice && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-hover/60 border border-border text-[11px] text-text-secondary font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate max-w-[150px]">
              {currentDevice.model || currentDevice.serial}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-hover hover:bg-surface-active text-text-muted hover:text-text-primary text-xs border border-border transition-colors cursor-pointer"
        >
          <Command className="w-3 h-3" />
          <span className="font-mono text-[11px]">Ctrl+K</span>
        </button>
      </div>

      {/* Window Controls */}
      <div
        className="flex items-center gap-0.5 -mr-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={handleMinimize}
          className="w-9 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="w-9 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="w-9 h-7 flex items-center justify-center rounded hover:bg-rose-500 hover:text-white text-text-secondary transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
