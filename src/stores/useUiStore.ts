import { create } from 'zustand';

export type NavigationTab =
  | 'dashboard'
  | 'devices'
  | 'mirror'
  | 'camera'
  | 'recording'
  | 'wireless'
  | 'files'
  | 'profiles'
  | 'adbTools'
  | 'logs'
  | 'settings';

export type TabType = NavigationTab;

interface UiStore {
  activeTab: NavigationTab;
  isSidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  isConfigModeAdvanced: boolean;

  setActiveTab: (tab: NavigationTab) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setConfigModeAdvanced: (advanced: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeTab: 'dashboard',
  isSidebarCollapsed: false,
  isCommandPaletteOpen: false,
  isConfigModeAdvanced: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  setConfigModeAdvanced: (advanced) => set({ isConfigModeAdvanced: advanced }),
}));
