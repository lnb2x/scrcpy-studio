import React from 'react';
import { DeviceState, ConnectionType } from '@/types/device';

interface StatusBadgeProps {
  state: DeviceState;
  connectionType?: ConnectionType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state }) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'device':
        return {
          label: 'Ready',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-400',
        };
      case 'unauthorized':
        return {
          label: 'Unauthorized',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-400 animate-pulse',
        };
      case 'offline':
        return {
          label: 'Offline',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dot: 'bg-rose-400',
        };
      case 'authorizing':
        return {
          label: 'Authorizing...',
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          dot: 'bg-blue-400 animate-pulse',
        };
      case 'bootloader':
        return {
          label: 'Fastboot',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dot: 'bg-purple-400',
        };
      case 'recovery':
        return {
          label: 'Recovery',
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          dot: 'bg-orange-400',
        };
      case 'sideload':
        return {
          label: 'Sideload',
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-400',
        };
      default:
        return {
          label: 'Disconnected',
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
