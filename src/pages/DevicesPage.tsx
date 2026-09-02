import React from 'react';
import {
  RefreshCw,
  Wifi,
  ShieldAlert,
  BatteryCharging,
  CheckCircle2,
  Radio,
  Play,
} from 'lucide-react';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useUiStore } from '@/stores/useUiStore';
import { useTranslation } from '@/lib/i18n';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

export const DevicesPage: React.FC = () => {
  const { t } = useTranslation();
  const { devices, selectedSerial, selectDevice, fetchDevices, deviceInfo, batteryInfo, isLoading } =
    useDeviceStore();
  const { startSession, sessions, stopSession } = useScrcpyStore();
  const { setActiveTab } = useUiStore();

  const selectedDevice = devices.find((d) => d.serial === selectedSerial) || devices[0];
  const activeSession = selectedDevice
    ? sessions.find((s) => s.deviceSerial === selectedDevice.serial && s.status === 'running')
    : null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {t('devices')}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {t('devicesDescription')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('wireless')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{t('wirelessConnect')}</span>
          </button>

          <button
            type="button"
            onClick={() => void fetchDevices()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{t('refreshDevices')}</span>
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <EmptyState
          title={t('noDeviceConnected')}
          description={t('noDeviceSubtext')}
          actionText={t('refreshDevices')}
          onAction={fetchDevices}
          isLoading={isLoading}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Device Cards List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {t('connectedDevices')} ({devices.length})
            </h3>

            <div className="space-y-3">
              {devices.map((device) => {
                const isSelected = device.serial === selectedSerial;
                const isLive = sessions.some(
                  (s) => s.deviceSerial === device.serial && s.status === 'running'
                );

                return (
                  <button
                    type="button"
                    key={device.serial}
                    onClick={() => selectDevice(device.serial)}
                    aria-pressed={isSelected}
                    className={`w-full p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-card border-primary ring-1 ring-primary/40 shadow-glow-primary/10 shadow-md'
                        : 'bg-card hover:bg-card-hover border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-mono font-semibold text-text-muted uppercase">
                        {device.manufacturer || device.brand || 'ANDROID'}
                      </span>
                      <StatusBadge state={device.state} connectionType={device.connectionType} />
                    </div>

                    <h4 className="text-sm font-bold text-text-primary truncate mb-1">
                      {device.model || device.device || device.serial}
                    </h4>

                    <div className="text-xs text-text-secondary flex items-center justify-between font-mono">
                      <span>{device.androidVersion ? `Android ${device.androidVersion}` : 'Android'}</span>
                      <span className="text-text-muted truncate max-w-[120px]">{device.serial}</span>
                    </div>

                    {isLive && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>{t('mirroringActive')}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Device Telemetry & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {selectedDevice ? (
              <>
                {/* Authorization Warning Banner */}
                {selectedDevice.state === 'unauthorized' && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <span>{t('deviceUnauthorized')}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-200/90">
                      {t('unauthorizedHelp')}
                    </p>
                    <ol className="text-xs space-y-1 list-decimal list-inside text-amber-200/80 pt-1 font-mono">
                      <li>{t('unlockPhoneStep')}</li>
                      <li>{t('approveUsbDialogStep')}</li>
                      <li>{t('alwaysAllowStep')}</li>
                    </ol>
                  </div>
                )}

                {/* Device Hardware Overview Card */}
                <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold text-text-muted uppercase">
                        {t('hardwareInspector')}
                      </span>
                      <h2 className="text-xl font-bold text-text-primary tracking-tight mt-0.5">
                        {selectedDevice.model || selectedDevice.device || selectedDevice.serial}
                      </h2>
                      <p className="text-xs text-text-secondary">
                        {t('serial')}: <span className="font-mono text-text-primary">{selectedDevice.serial}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSession ? (
                        <button
                          type="button"
                          onClick={() => void stopSession(activeSession.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm transition-all"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>{t('stopMirror')}</span>
                        </button>
                      ) : selectedDevice.state === 'device' ? (
                        <button
                          type="button"
                          onClick={() => void startSession({ serial: selectedDevice.serial })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{t('startMirror')}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Specifications Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">{t('androidVer')}</span>
                      <span className="text-xs font-semibold text-text-primary mt-1 block">
                        {deviceInfo?.androidVersion || selectedDevice.androidVersion || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">{t('apiLevel')}</span>
                      <span className="text-xs font-semibold text-text-primary mt-1 block">
                        {deviceInfo?.apiLevel || selectedDevice.apiLevel || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">{t('screenSize')}</span>
                      <span className="text-xs font-semibold text-text-primary mt-1 block">
                        {deviceInfo?.screenResolution || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">{t('densityLabel')}</span>
                      <span className="text-xs font-semibold text-text-primary mt-1 block">
                        {deviceInfo?.screenDensity || '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">{t('batteryLevel')}</span>
                      <span className="text-xs font-semibold text-text-primary mt-1 block flex items-center gap-1">
                        {batteryInfo?.isCharging && (
                          <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        )}
                        {batteryInfo?.level !== undefined ? `${batteryInfo.level}%` : '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface border border-border">
                      <span className="text-[10px] uppercase font-mono text-text-muted block">{t('temperature')}</span>
                      <span className="text-xs font-semibold text-text-primary mt-1 block">
                        {batteryInfo?.temperature !== undefined ? `${batteryInfo.temperature}°C` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Capability Badges */}
                  <div>
                    <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5">
                      {t('featureCapabilities')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          deviceInfo?.supportsAudio === true
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-surface text-text-muted border-border'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t('audioForwardingCapability')}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          deviceInfo?.supportsCamera === true
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-surface text-text-muted border-border'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t('cameraMirroringCapability')}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          deviceInfo?.supportsVirtualDisplay === true
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-surface text-text-muted border-border'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> {t('virtualDisplayCapability')}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
