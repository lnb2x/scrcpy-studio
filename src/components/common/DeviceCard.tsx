import React from 'react';
import {
  Smartphone,
  Battery,
  BatteryCharging,
  Wifi,
  Usb,
  Play,
  Moon,
  Video,
} from 'lucide-react';
import { AndroidDevice, BatteryInfo } from '@/types/device';
import { StatusBadge } from './StatusBadge';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useUiStore } from '@/stores/useUiStore';
import { useTranslation } from '@/lib/i18n';

interface DeviceCardProps {
  device: AndroidDevice;
  isSelected: boolean;
  battery?: BatteryInfo | null;
  onSelect: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isSelected,
  battery,
  onSelect,
}) => {
  const { t } = useTranslation();
  const { startSession } = useScrcpyStore();
  const { setActiveTab } = useUiStore();

  const handleStartMirror = (e: React.MouseEvent) => {
    e.stopPropagation();
    void startSession({ serial: device.serial });
  };

  const handleMirrorScreenOff = (e: React.MouseEvent) => {
    e.stopPropagation();
    void startSession({ serial: device.serial, turnScreenOff: true });
  };

  const handleOpenRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab('recording');
  };

  return (
    <div
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group shadow-sm ${
        isSelected
          ? 'bg-card border-primary ring-1 ring-primary/40 shadow-glow-primary/10'
          : 'bg-card hover:bg-card-hover border-border'
      }`}
    >
      {/* Top Details */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-primary-light text-primary border border-primary/30'
                : 'bg-surface-hover text-text-secondary border border-border'
            }`}
          >
            <Smartphone className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
                {device.manufacturer || device.brand || 'ANDROID'}
              </span>
              <StatusBadge state={device.state} connectionType={device.connectionType} />
            </div>

            <h3 className="text-lg font-bold text-text-primary tracking-tight mt-0.5">
              {device.model || device.device || device.serial}
            </h3>
          </div>
        </div>

        {/* Connection Type Indicator & Battery */}
        <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
          {device.connectionType === 'tcpip' ? (
            <span className="flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              <Wifi className="w-3 h-3" /> Wi-Fi
            </span>
          ) : (
            <span className="flex items-center gap-1 text-primary bg-primary-light px-2 py-0.5 rounded-full border border-primary/20">
              <Usb className="w-3 h-3" /> USB
            </span>
          )}

          {battery && battery.level !== undefined && (
            <span className="flex items-center gap-1 text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border">
              {battery.isCharging ? (
                <BatteryCharging className="w-3 h-3 text-emerald-400 animate-pulse" />
              ) : (
                <Battery className="w-3 h-3" />
              )}
              {battery.level}%
            </span>
          )}
        </div>
      </div>

      {/* Info Specs Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5 text-xs font-mono">
        <div className="p-2 rounded-lg bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase block">{t('serial')}</span>
          <span className="text-text-primary font-semibold truncate block" title={device.serial}>
            {device.serial}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase block">{t('androidVer')}</span>
          <span className="text-text-primary font-semibold block">
            {device.androidVersion ? `Android ${device.androidVersion}` : t('unknown')}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase block">{t('apiLevel')}</span>
          <span className="text-text-primary font-semibold block">
            {device.apiLevel ? `API ${device.apiLevel}` : '—'}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase block">{t('display')}</span>
          <span className="text-text-primary font-semibold block">
            {device.screenResolution || '—'}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase block">{t('battery')}</span>
          <span className="text-text-primary font-semibold block">
            {battery?.level !== undefined ? `${battery.level}%` : '—'} ·{' '}
            {battery?.isCharging ? t('charging') : t('discharging')}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-surface border border-border">
          <span className="text-[10px] text-text-muted uppercase block">{t('temperature')}</span>
          <span className="text-text-primary font-semibold block">
            {battery?.temperature !== undefined ? `${battery.temperature.toFixed(1)} °C` : '—'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleStartMirror}
          disabled={device.state !== 'device'}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all transform active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{t('startMirror')}</span>
        </button>

        <button
          type="button"
          onClick={handleMirrorScreenOff}
          disabled={device.state !== 'device'}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
          title={t('turnScreenOffOnStart')}
        >
          <Moon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('screenOff')}</span>
        </button>

        <button
          type="button"
          onClick={handleOpenRecording}
          disabled={device.state !== 'device'}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
          title={t('openRecordingStudio')}
        >
          <Video className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">{t('record')}</span>
        </button>
      </div>
    </div>
  );
};
