import React from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Cast,
  Camera,
  Video,
  Wifi,
  FolderOpen,
  Bookmark,
  Wrench,
  Terminal,
  Settings,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useUiStore, TabType } from '@/stores/useUiStore';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useTranslation, type TranslationKey } from '@/lib/i18n';

interface NavItem {
  id: TabType;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Sidebar: React.FC = () => {
  const { t, tf } = useTranslation();
  const { activeTab, setActiveTab, isSidebarCollapsed, setSidebarCollapsed } = useUiStore();
  const { devices } = useDeviceStore();
  const { sessions } = useScrcpyStore();

  const activeSessionsCount = sessions.filter((s) => s.status === 'running').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
    { id: 'devices', labelKey: 'devices', icon: Smartphone, badge: devices.length || undefined },
    { id: 'mirror', labelKey: 'mirror', icon: Cast },
    { id: 'camera', labelKey: 'camera', icon: Camera },
    { id: 'recording', labelKey: 'recording', icon: Video },
    { id: 'wireless', labelKey: 'wireless', icon: Wifi },
    { id: 'files', labelKey: 'files', icon: FolderOpen },
    { id: 'profiles', labelKey: 'profiles', icon: Bookmark },
    { id: 'adbTools', labelKey: 'adbTools', icon: Wrench },
    { id: 'logs', labelKey: 'logs', icon: Terminal },
    { id: 'settings', labelKey: 'settings', icon: Settings },
  ];

  return (
    <aside
      className={`h-full bg-surface/60 backdrop-blur-md border-r border-border flex flex-col justify-between transition-all duration-200 select-none z-40 shrink-0 ${
        isSidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation Links */}
      <div className="p-2.5 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
                isActive
                  ? 'bg-primary-light text-primary font-semibold shadow-sm ring-1 ring-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
              title={isSidebarCollapsed ? t(item.labelKey) : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary'
                }`}
              />

              {!isSidebarCollapsed && (
                <span className="truncate flex-1 text-left">
                  {t(item.labelKey)}
                </span>
              )}

              {/* Badges */}
              {item.badge !== undefined && !isSidebarCollapsed && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-surface-hover text-text-secondary border border-border">
                  {item.badge}
                </span>
              )}

              {/* Active Mirroring Indicator on Mirror Tab */}
              {item.id === 'mirror' && activeSessionsCount > 0 && (
                <span className="absolute right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Area: Active Session Widget & Collapse Button */}
      <div className="p-2.5 border-t border-border space-y-2">
        {activeSessionsCount > 0 && !isSidebarCollapsed && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {tf('activeSessions', { count: activeSessionsCount })}
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        )}

        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors text-xs"
          title={isSidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[11px] text-text-muted">{t('collapseSidebar')}</span>
              <ChevronLeft className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
