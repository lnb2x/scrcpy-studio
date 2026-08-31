import React from 'react';
import {
  Smartphone,
  Radio,
  XCircle,
  Battery,
  BatteryCharging,
  Wifi,
  Usb,
  RotateCw,
} from 'lucide-react';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTranslation } from '@/lib/i18n';

export const StatusBar: React.FC = () => {
  const { t } = useTranslation();
  const { devices, selectedSerial, batteryInfo, isLoading, fetchDevices } = useDeviceStore();
  const { sessions, lastError } = useScrcpyStore();
  const { detection } = useSettingsStore();

  const selectedDevice = devices.find((d) => d.serial === selectedSerial);
  const activeSessions = sessions.filter((s) => s.status === 'running');

  return (
    <footer className="h-7 w-full bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-between px-3 text-[11px] font-mono select-none text-text-secondary z-40 shrink-0">
      {/* Left Area: Selected Device & Hardware Info */}
      <div className="flex items-center gap-3">
        {selectedDevice ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-text-primary">
              {selectedDevice.connectionType === 'tcpip' ? (
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Usb className="w-3.5 h-3.5 text-primary" />
              )}
              <span className="font-semibold">
                {selectedDevice.model || selectedDevice.serial}
              </span>
            </div>

            <span className="text-text-muted">•</span>
            <span className="text-text-muted">{selectedDevice.serial}</span>

            {batteryInfo && batteryInfo.level !== undefined && (
              <>
                <span className="text-text-muted">•</span>
                <div className="flex items-center gap-1">
                  {batteryInfo.isCharging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <Battery className="w-3.5 h-3.5" />
                  )}
                  <span>{batteryInfo.level}%</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-text-muted">
            <Smartphone className="w-3.5 h-3.5" />
            <span>{t('noDeviceConnected')}</span>
          </div>
        )}

        <button
          onClick={() => fetchDevices()}
          disabled={isLoading}
          className="hover:text-text-primary p-0.5"
          title="Refresh ADB devices"
        >
          <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Center Area: Active Session or Recent Error */}
      <div className="hidden md:flex items-center gap-2">
        {activeSessions.length > 0 ? (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>
              {activeSessions.length} session{activeSessions.length > 1 ? 's' : ''} running
            </span>
          </div>
        ) : lastError ? (
          <div className="flex items-center gap-1.5 text-rose-400 truncate max-w-sm">
            <XCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{lastError}</span>
          </div>
        ) : (
          <span className="text-text-muted">Ready</span>
        )}
      </div>

      {/* Right Area: Toolchain Versions (scrcpy & adb) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span>scrcpy</span>
          {detection?.isScrcpyReady ? (
            <span className="text-emerald-400 font-bold">
              v{detection.scrcpyVersion || '4.1'}
            </span>
          ) : (
            <span className="text-rose-400">offline</span>
          )}
        </div>

        <span className="text-text-muted">•</span>

        <div className="flex items-center gap-1">
          <span>adb</span>
          {detection?.isAdbReady ? (
            <span className="text-emerald-400 font-bold">
              v{detection.adbVersion || '1.0.41'}
            </span>
          ) : (
            <span className="text-rose-400">offline</span>
          )}
        </div>
      </div>
    </footer>
  );
};
