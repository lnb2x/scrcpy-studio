import React from 'react';
import { DeviceState, ConnectionType } from '@/types/device';
import { useTranslation } from '@/lib/i18n';

interface StatusBadgeProps {
  state: DeviceState;
  connectionType?: ConnectionType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state }) => {
  const { t } = useTranslation();
  const getBadgeConfig = () => {
    switch (state) {
      case 'device':
        return {
          label: t('stateReady'),
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-400',
        };
      case 'unauthorized':
        return {
          label: t('stateUnauthorized'),
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'offline':
        return {
          label: t('stateOffline'),
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dot: 'bg-rose-400',
        };
      case 'authorizing':
        return {
          label: t('stateAuthorizing'),
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          dot: 'bg-blue-400 animate-pulse',
        };
      case 'bootloader':
        return {
          label: t('stateBootloader'),
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dot: 'bg-purple-400',
        };
      case 'recovery':
        return {
          label: t('stateRecovery'),
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          dot: 'bg-orange-400',
        };
      case 'sideload':
        return {
          label: t('stateSideload'),
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-400',
        };
      default:
        return {
          label: t('stateDisconnected'),
          bg: 'bg-surface-hover text-text-muted border-border',
          dot: 'bg-text-muted',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${config.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};
