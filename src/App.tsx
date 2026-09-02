import React, { Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { CommandPalette } from './components/common/CommandPalette';
import { ShortcutsOverlay } from './components/common/ShortcutsOverlay';
import { OnboardingModal } from './components/onboarding/OnboardingModal';

import { useUiStore } from './stores/useUiStore';
import { useDeviceStore } from './stores/useDeviceStore';
import { useScrcpyStore } from './stores/useScrcpyStore';
import { useSettingsStore } from './stores/useSettingsStore';

// Pages are code-split so each tab only loads its own chunk on first visit.
const PAGES: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))),
  devices: React.lazy(() => import('./pages/DevicesPage').then((m) => ({ default: m.DevicesPage }))),
  mirror: React.lazy(() => import('./pages/MirrorPage').then((m) => ({ default: m.MirrorPage }))),
  camera: React.lazy(() => import('./pages/CameraPage').then((m) => ({ default: m.CameraPage }))),
  recording: React.lazy(() => import('./pages/RecordingPage').then((m) => ({ default: m.RecordingPage }))),
  wireless: React.lazy(() => import('./pages/WirelessPage').then((m) => ({ default: m.WirelessPage }))),
  files: React.lazy(() => import('./pages/FilesPage').then((m) => ({ default: m.FilesPage }))),
  profiles: React.lazy(() => import('./pages/ProfilesPage').then((m) => ({ default: m.ProfilesPage }))),
  adbTools: React.lazy(() => import('./pages/AdbToolsPage').then((m) => ({ default: m.AdbToolsPage }))),
  logs: React.lazy(() => import('./pages/LogsPage').then((m) => ({ default: m.LogsPage }))),
  settings: React.lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))),
};

export const App: React.FC = () => {
  const { activeTab, setActiveTab, toggleSidebar } = useUiStore();
  const { fetchDevices } = useDeviceStore();
  const { initEventListener, startSession } = useScrcpyStore();
  const { loadSettings, settings } = useSettingsStore();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    void loadSettings();
    void initEventListener();
    void fetchDevices();
  }, [fetchDevices, initEventListener, loadSettings]);

  useEffect(() => {
    if (!settings.autoRefreshDevices) return;

    const intervalSeconds = Math.min(Math.max(settings.autoRefreshInterval || 4, 3), 60);
    const interval = window.setInterval(() => void fetchDevices(), intervalSeconds * 1000);
    return () => window.clearInterval(interval);
  }, [fetchDevices, settings.autoRefreshDevices, settings.autoRefreshInterval]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ctrl + R: Refresh devices
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r' && !e.shiftKey) {
        e.preventDefault();
        void fetchDevices();
      }
      // Ctrl + B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      // ? (Shift + /): Shortcuts overlay — skip while typing in inputs
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isTyping) {
          e.preventDefault();
          setIsShortcutsOpen(true);
        }
      }
      // Ctrl + Shift + M: Start Mirror
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        void startSession();
      }
      // Ctrl + Shift + R: Start Recording / Open Recording Studio
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setActiveTab('recording');
      }
      // Ctrl + ,: Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [fetchDevices, startSession, setActiveTab, toggleSidebar]);

  const ActivePage = PAGES[activeTab] ?? PAGES.dashboard;

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-text-primary overflow-hidden select-none font-sans">
      {/* Frameless Custom Window Titlebar */}
      <TitleBar />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-background/50">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="min-h-full"
            >
              <Suspense
                fallback={
                  <div className="h-64 flex items-center justify-center text-text-muted">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                }
              >
                <ActivePage />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Persistent Bottom Status Bar */}
      <StatusBar />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Keyboard Shortcuts Overlay (?) */}
      <ShortcutsOverlay isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        theme={settings.theme === 'light' ? 'light' : 'dark'}
        duration={4000}
      />

      {/* First Launch Onboarding Wizard */}
      <OnboardingModal />
    </div>
  );
};

export default App;
