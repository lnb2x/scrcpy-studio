import React, { useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { CommandPalette } from './components/common/CommandPalette';
import { OnboardingModal } from './components/onboarding/OnboardingModal';

import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { MirrorPage } from './pages/MirrorPage';
import { CameraPage } from './pages/CameraPage';
import { RecordingPage } from './pages/RecordingPage';
import { WirelessPage } from './pages/WirelessPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { AdbToolsPage } from './pages/AdbToolsPage';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';

import { useUiStore } from './stores/useUiStore';
import { useDeviceStore } from './stores/useDeviceStore';
import { useScrcpyStore } from './stores/useScrcpyStore';
import { useSettingsStore } from './stores/useSettingsStore';

export const App: React.FC = () => {
  const { activeTab, setActiveTab } = useUiStore();
  const { fetchDevices } = useDeviceStore();
  const { initEventListener, startSession } = useScrcpyStore();
  const { loadSettings, settings } = useSettingsStore();

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
        fetchDevices();
      }
      // Ctrl + Shift + M: Start Mirror
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        startSession();
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
  }, [fetchDevices, startSession, setActiveTab]);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'devices':
        return <DevicesPage />;
      case 'mirror':
        return <MirrorPage />;
      case 'camera':
        return <CameraPage />;
      case 'recording':
        return <RecordingPage />;
      case 'wireless':
        return <WirelessPage />;
      case 'profiles':
        return <ProfilesPage />;
      case 'adbTools':
        return <AdbToolsPage />;
      case 'logs':
        return <LogsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

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
          {renderActivePage()}
        </main>
      </div>

      {/* Persistent Bottom Status Bar */}
      <StatusBar />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* First Launch Onboarding Wizard */}
      <OnboardingModal />
    </div>
  );
};

export default App;
