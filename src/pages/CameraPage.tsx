import React, { useState } from 'react';
import { Camera, RefreshCw, Play, Video, Flashlight, ZoomIn, Radio } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTranslation } from '@/lib/i18n';
import { CameraConfig, CameraInfoItem } from '@/types/scrcpy';
import { CommandPreview } from '@/components/common/CommandPreview';

export const CameraPage: React.FC = () => {
  const { t } = useTranslation();
  const { config, startSession, sessions, stopSession } = useScrcpyStore();
  const { selectedDevice } = useDeviceStore();
  const { settings } = useSettingsStore();

  const [cameraConfig, setCameraConfig] = useState<CameraConfig>({
    enabled: true,
    cameraFacing: 'back',
    cameraSize: '1920x1080',
    cameraFps: 30,
    cameraHighSpeed: false,
    cameraTorch: false,
    cameraZoom: 1.0,
  });

  const [detectedCameras, setDetectedCameras] = useState<CameraInfoItem[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const activeSession = selectedDevice
    ? sessions.find((s) => s.deviceSerial === selectedDevice.serial && s.mode === 'camera' && s.status === 'running')
    : null;

  const cameraSessionConfig = {
    ...config,
    serial: selectedDevice?.serial,
    camera: { ...cameraConfig, enabled: true },
  };

  const handleDetectCameras = async () => {
    setIsDetecting(true);
    try {
      const list = await invoke<CameraInfoItem[]>('list_cameras', {
        serial: selectedDevice?.serial,
      });
      setDetectedCameras(list);
      if (list.length > 0) {
        setCameraConfig((prev) => ({
          ...prev,
          cameraId: list[0].id,
          cameraFacing: (list[0].facing as any) || 'back',
        }));
      }
    } catch (e) {
      console.warn('Failed to detect cameras:', e);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleStartCameraMirror = () => {
    startSession(cameraSessionConfig, 'camera');
  };

  const handleRecordCamera = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const deviceName = (selectedDevice?.serial || 'device').replace(/[<>:"/\\|?*]/g, '_');
    const directory = settings.recordingsDir.replace(/[\\/]+$/g, '');
    const path = `${directory ? `${directory}\\` : ''}camera_${deviceName}_${timestamp}.mp4`;
    const fullConfig = {
      ...cameraSessionConfig,
      recordPath: path,
      recordFormat: 'mp4' as const,
    };
    startSession(fullConfig, 'camera');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {t('cameraTitle')}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {t('cameraSubtext')}
          </p>
        </div>

        <button
          onClick={handleDetectCameras}
          disabled={isDetecting || !selectedDevice}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-active text-text-secondary hover:text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
          <span>{t('detectCameras')}</span>
        </button>
      </div>

      {/* Main Camera Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border space-y-6">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Camera Controls & Sensor Setup
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Camera Facing Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                {t('cameraFacing')}
              </label>
              <div className="flex gap-2">
                {(['back', 'front', 'external'] as const).map((facing) => (
                  <button
                    key={facing}
                    type="button"
                    onClick={() => setCameraConfig((prev) => ({ ...prev, cameraFacing: facing }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all ${
                      cameraConfig.cameraFacing === facing
                        ? 'bg-primary-light border-primary/50 text-primary font-bold'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                    }`}
                  >
                    {facing}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Size / Resolution */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                Camera Resolution
              </label>
              <select
                value={cameraConfig.cameraSize || '1920x1080'}
                onChange={(e) => setCameraConfig((prev) => ({ ...prev, cameraSize: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary font-mono"
              >
                <option value="3840x2160">3840x2160 (4K UHD)</option>
                <option value="1920x1080">1920x1080 (1080p FHD)</option>
                <option value="1280x720">1280x720 (720p HD)</option>
                <option value="640x480">640x480 (VGA)</option>
              </select>
            </div>

            {/* Camera Frame Rate */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                Capture Frame Rate (FPS)
              </label>
              <div className="flex gap-2">
                {[30, 60].map((fps) => (
                  <button
                    key={fps}
                    type="button"
                    onClick={() => setCameraConfig((prev) => ({ ...prev, cameraFps: fps }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                      cameraConfig.cameraFps === fps
                        ? 'bg-primary-light border-primary/50 text-primary'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Zoom Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-primary flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{t('cameraZoom')}</span>
                </label>
                <span className="text-xs font-mono text-primary font-bold">
                  {cameraConfig.cameraZoom?.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={cameraConfig.cameraZoom || 1.0}
                onChange={(e) =>
                  setCameraConfig((prev) => ({ ...prev, cameraZoom: parseFloat(e.target.value) }))
                }
                className="w-full accent-primary bg-surface h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Torch & High Speed Toggles */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
              <input
                type="checkbox"
                checked={cameraConfig.cameraTorch || false}
                onChange={(e) =>
                  setCameraConfig((prev) => ({ ...prev, cameraTorch: e.target.checked }))
                }
                className="rounded text-primary focus:ring-0"
              />
              <span className="flex items-center gap-1.5">
                <Flashlight className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('cameraTorch')}</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-text-primary">
              <input
                type="checkbox"
                checked={cameraConfig.cameraHighSpeed || false}
                onChange={(e) =>
                  setCameraConfig((prev) => ({ ...prev, cameraHighSpeed: e.target.checked }))
                }
                className="rounded text-primary focus:ring-0"
              />
              <span>{t('cameraHighSpeed')}</span>
            </label>
          </div>

          {/* Action Launch Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {activeSession ? (
              <button
                onClick={() => stopSession(activeSession.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Stop Camera Stream</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleStartCameraMirror}
                  disabled={!selectedDevice}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{t('startCameraMirror')}</span>
                </button>

                <button
                  onClick={handleRecordCamera}
                  disabled={!selectedDevice}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-hover hover:bg-surface-active text-text-primary text-xs font-semibold border border-border transition-colors disabled:opacity-50"
                >
                  <Video className="w-4 h-4 text-rose-400" />
                  <span>{t('recordCamera')}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Detected Hardware Cameras Info */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Detected Camera Sensors
          </h3>

          {detectedCameras.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted rounded-xl bg-surface border border-border space-y-2">
              <Camera className="w-6 h-6 mx-auto text-text-muted" />
              <p>No camera data queried yet.</p>
              <button
                onClick={handleDetectCameras}
                className="text-xs text-primary hover:underline"
              >
                Click to probe device cameras
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {detectedCameras.map((cam) => (
                <div
                  key={cam.id}
                  onClick={() =>
                    setCameraConfig((prev) => ({
                      ...prev,
                      cameraId: cam.id,
                      cameraFacing: (cam.facing as any) || 'back',
                    }))
                  }
                  className="p-3 rounded-xl bg-surface border border-border hover:border-primary/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text-primary">Camera {cam.id}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-hover text-text-muted">
                      {cam.facing}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary font-mono">
                    Sizes: {cam.sizes.slice(0, 3).join(', ') || '1920x1080'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CommandPreview
        onRun={handleStartCameraMirror}
        previewConfig={cameraSessionConfig}
        sessionMode="camera"
      />
    </div>
  );
};
