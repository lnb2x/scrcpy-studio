import React from 'react';
import {
  Cast,
  Volume2,
  Moon,
  Video,
  Camera,
  Wifi,
  Keyboard,
  MonitorPlay,
  RefreshCw,
  Clock,
  Radio,
  ChevronRight,
} from 'lucide-react';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useUiStore } from '@/stores/useUiStore';
import { useTranslation } from '@/lib/i18n';
import { DeviceCard } from '@/components/common/DeviceCard';
import { QuickActionCard } from '@/components/common/QuickActionCard';
import { EmptyState } from '@/components/common/EmptyState';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { devices, selectedSerial, selectDevice, fetchDevices, batteryInfo, isLoading } = useDeviceStore();
  const { startSession, history, stopSession } = useScrcpyStore();
  const { setActiveTab } = useUiStore();

  const selectedDevice = devices.find((d) => d.serial === selectedSerial) || devices[0];

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-xl leading-relaxed">
            {t('goodGreeting')}
          </p>
        </div>

        <button
          onClick={() => fetchDevices()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-all transform active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{t('refreshDevices')}</span>
        </button>
      </div>

      {/* Main Grid: Active Device & Status */}
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
          {/* Active Device Primary Card */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              {t('activeDevice')}
            </h3>
            {selectedDevice && (
              <DeviceCard
                device={selectedDevice}
                isSelected={true}
                battery={batteryInfo}
                onSelect={() => selectDevice(selectedDevice.serial)}
              />
            )}
          </div>

          {/* Quick Stats / Connected Device List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {t('devices')} ({devices.length})
              </h3>
              <button
                onClick={() => setActiveTab('devices')}
                className="text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {devices.map((dev) => (
                <div
                  key={dev.serial}
                  onClick={() => selectDevice(dev.serial)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    dev.serial === selectedDevice?.serial
                      ? 'bg-primary-light border-primary/40'
                      : 'bg-card hover:bg-card-hover border-border'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="text-xs font-semibold text-text-primary block truncate">
                      {dev.model || dev.device || dev.serial}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {dev.serial} • {dev.connectionType.toUpperCase()}
                    </span>
                  </div>

                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      dev.state === 'device'
                        ? 'bg-emerald-400'
                        : dev.state === 'unauthorized'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
          {t('quickActions')}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title={t('actionMirror')}
            description="Start real-time screen mirror at recommended settings"
            icon={Cast}
            badge="Default"
            disabled={!selectedDevice || selectedDevice.state !== 'device'}
            onClick={() => startSession()}
          />

          <QuickActionCard
            title={t('actionMirrorAudio')}
            description="Mirror device screen with low-latency audio forwarding"
            icon={Volume2}
            disabled={!selectedDevice || selectedDevice.state !== 'device'}
            onClick={() => startSession({ audioEnabled: true })}
          />

          <QuickActionCard
            title={t('actionScreenOff')}
            description="Turn off device physical screen while mirroring"
            icon={Moon}
            disabled={!selectedDevice || selectedDevice.state !== 'device'}
            onClick={() => startSession({ turnScreenOff: true })}
          />

          <QuickActionCard
            title={t('actionRecord')}
            description="Open recording studio to capture video/audio sessions"
            icon={Video}
            onClick={() => setActiveTab('recording')}
          />

          <QuickActionCard
            title={t('actionCamera')}
            description="Stream front or back camera directly to your desktop"
            icon={Camera}
            onClick={() => setActiveTab('camera')}
          />

          <QuickActionCard
            title={t('actionWireless')}
            description="Connect wirelessly over Wi-Fi without USB cables"
            icon={Wifi}
            onClick={() => setActiveTab('wireless')}
          />

          <QuickActionCard
            title={t('actionOtg')}
            description="Control device with PC keyboard & mouse (no screen mirror)"
            icon={Keyboard}
            disabled={!selectedDevice}
            onClick={() => startSession(undefined, 'otg')}
          />

          <QuickActionCard
            title={t('actionVirtualDisplay')}
            description="Create a standalone Android virtual display window"
            icon={MonitorPlay}
            disabled={!selectedDevice || selectedDevice.state !== 'device'}
            onClick={() =>
              startSession(
                { virtualDisplay: { enabled: true, resolution: '1920x1080' } },
                'virtual_display'
              )
            }
          />
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {t('recentSessions')}
          </h3>
          {history.length > 0 && (
            <button
              onClick={() => setActiveTab('logs')}
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              View logs <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-card border border-border text-xs text-text-muted">
            {t('noSessionsYet')}
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((session) => {
              const duration = session.stoppedAt
                ? Math.floor((session.stoppedAt - session.startedAt) / 1000)
                : null;
              const durationStr = duration !== null
                ? `${Math.floor(duration / 60)}m ${duration % 60}s`
                : 'In Progress';

              return (
                <div
                  key={session.id}
                  className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        session.status === 'running'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-surface-hover text-text-muted border border-border'
                      }`}
                    >
                      {session.status === 'running' ? (
                        <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <span className="font-semibold text-text-primary block">
                        {session.deviceSerial} •{' '}
                        <span className="capitalize">{session.mode || 'Mirror'}</span>
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        {new Date(session.startedAt).toLocaleTimeString()} • Duration: {durationStr}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase ${
                        session.status === 'running'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-surface-hover text-text-muted border border-border'
                      }`}
                    >
                      {session.status}
                    </span>

                    {session.status === 'running' && (
                      <button
                        onClick={() => stopSession(session.id)}
                        className="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium transition-colors"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
