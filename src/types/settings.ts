export type AppTheme = 'dark' | 'light' | 'system';
export type AccentColor = 'blue' | 'violet' | 'cyan' | 'emerald';
export type DensityMode = 'comfortable' | 'compact';
export type AnimationMode = 'full' | 'reduced' | 'off';
export type AppLanguage = 'en' | 'vi';

export interface AppSettings {
  // Executables
  scrcpyPath: string;
  adbPath: string;
  autoDetectExecutables: boolean;

  // General
  launchOnStartup: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  autoRefreshDevices: boolean;
  autoRefreshInterval: number; // in seconds (3 - 10)
  rememberLastDevice: boolean;
  rememberLastProfile: boolean;
  lastDeviceSerial?: string;
  lastProfileId?: string;
  hasCompletedOnboarding?: boolean;

  // Appearance
  theme: AppTheme;
  accentColor: AccentColor;
  density: DensityMode;
  animation: AnimationMode;
  language: AppLanguage;

  // Storage Directories
  recordingsDir: string;
  screenshotsDir: string;
  logsDir: string;
  defaultRecordFormat: 'mp4' | 'mkv';

  // Developer
  developerMode: boolean;
  basicModeOnly: boolean;
}
