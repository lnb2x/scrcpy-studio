import React, { useState } from 'react';
import {
  Video,
  Volume2,
  Keyboard,
  AppWindow,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useDeviceStore } from '@/stores/useDeviceStore';
import { useUiStore } from '@/stores/useUiStore';
import { useTranslation } from '@/lib/i18n';
import { SMART_PRESETS } from '@/lib/commandBuilder';
import { CommandPreview } from '@/components/common/CommandPreview';
import { EncoderInfoItem, VideoCodec, AudioCodec, InputMode, GamepadMode } from '@/types/scrcpy';

type MirrorTab = 'video' | 'audio' | 'input' | 'window' | 'advanced';

export const MirrorPage: React.FC = () => {
  const { t } = useTranslation();
  const { config, updateConfig, applyPreset, selectedPresetId, startSession } =
    useScrcpyStore();
  const { selectedDevice } = useDeviceStore();
  const { isConfigModeAdvanced, setConfigModeAdvanced } = useUiStore();

  const [activeTab, setActiveTab] = useState<MirrorTab>('video');
  const [encoders, setEncoders] = useState<EncoderInfoItem[]>([]);
  const [isLoadingEncoders, setIsLoadingEncoders] = useState(false);
  const [customArgInput, setCustomArgInput] = useState('');

  const handleFetchEncoders = async () => {
    setIsLoadingEncoders(true);
    try {
      const list = await invoke<EncoderInfoItem[]>('list_encoders', {
        serial: selectedDevice?.serial,
      });
      setEncoders(list);
    } catch (e) {
      console.warn('Failed to fetch encoders:', e);
    } finally {
      setIsLoadingEncoders(false);
    }
  };

  const addCustomArg = () => {
    if (!customArgInput.trim()) return;
    const current = config.customArgs || [];
    if (!current.includes(customArgInput.trim())) {
      updateConfig({ customArgs: [...current, customArgInput.trim()] });
    }
    setCustomArgInput('');
  };

  const removeCustomArg = (index: number) => {
    const current = config.customArgs || [];
    updateConfig({ customArgs: current.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header with Basic/Advanced switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {t('mirrorTitle')}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {t('mirrorSubtext')}
          </p>
        </div>

        {/* Basic vs Advanced Mode Toggle */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border self-start">
          <button
            onClick={() => setConfigModeAdvanced(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isConfigModeAdvanced
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('basicMode')}
          </button>
          <button
            onClick={() => setConfigModeAdvanced(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isConfigModeAdvanced
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('advancedMode')}
          </button>
        </div>
      </div>

      {/* Smart Presets Bar */}
      <div className="space-y-2.5">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
          {t('presets')}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {SMART_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-primary-light border-primary/50 text-primary shadow-sm ring-1 ring-primary/30'
                    : 'bg-card hover:bg-card-hover border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-xs font-bold block truncate">{preset.name}</span>
                <span className="text-[10px] text-text-muted block truncate mt-0.5">
                  {preset.config.maxSize ? `${preset.config.maxSize}p` : 'Native'} • {preset.config.maxFps || 60}FPS
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Tabs */}
      <div className="space-y-4">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'video'
                ? 'bg-surface text-primary border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>{t('videoSettings')}</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'audio'
                ? 'bg-surface text-primary border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{t('audioSettings')}</span>
          </button>

          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'input'
                ? 'bg-surface text-primary border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>{t('inputSettings')}</span>
          </button>

          <button
            onClick={() => setActiveTab('window')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'window'
                ? 'bg-surface text-primary border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <AppWindow className="w-4 h-4" />
            <span>{t('windowSettings')}</span>
          </button>

          {isConfigModeAdvanced && (
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'advanced'
                  ? 'bg-surface text-primary border border-border'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>{t('advancedSettings')}</span>
            </button>
          )}
        </div>

        {/* Tab Content Panels */}
        <div className="p-6 rounded-2xl bg-card border border-border min-h-[320px]">
          {/* VIDEO TAB */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Video Codec */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('videoCodec')}
                  </label>
                  <select
                    value={config.videoCodec || 'h264'}
                    onChange={(e) => updateConfig({ videoCodec: e.target.value as VideoCodec })}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="h264">H.264 / AVC (Default, highly compatible)</option>
                    <option value="h265">H.265 / HEVC (High quality, lower bitrate)</option>
                    <option value="av1">AV1 (Next-gen open standard)</option>
                    <option value="vp8">VP8 (scrcpy 4.1)</option>
                    <option value="vp9">VP9 (scrcpy 4.1)</option>
                  </select>
                </div>

                {/* Resolution / Max Size */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('resolution')}
                  </label>
                  <select
                    value={config.maxSize || 0}
                    onChange={(e) => updateConfig({ maxSize: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value={0}>Native Device Resolution</option>
                    <option value={2560}>2560p (2K Ultra)</option>
                    <option value={1920}>1920p (Full HD)</option>
                    <option value={1600}>1600p (Balanced)</option>
                    <option value={1280}>1280p (HD)</option>
                    <option value={1024}>1024p (Fast)</option>
                    <option value={800}>800p (Low end)</option>
                  </select>
                </div>

                {/* Frame Rate FPS */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('frameRate')}: <span className="font-mono text-primary">{config.maxFps || 60} FPS</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[30, 60, 90, 120].map((fps) => (
                      <button
                        key={fps}
                        type="button"
                        onClick={() => updateConfig({ maxFps: fps })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
                          (config.maxFps || 60) === fps
                            ? 'bg-primary-light border-primary/50 text-primary font-bold'
                            : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                        }`}
                      >
                        {fps}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bitrate */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('videoBitrate')}: <span className="font-mono text-primary">{config.videoBitrate || '8M'}</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['2M', '4M', '8M', '12M', '16M', '24M', '32M'].map((br) => (
                      <button
                        key={br}
                        type="button"
                        onClick={() => updateConfig({ videoBitrate: br })}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${
                          (config.videoBitrate || '8M') === br
                            ? 'bg-primary-light border-primary/50 text-primary font-bold'
                            : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                        }`}
                      >
                        {br}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Encoder Selection */}
                {isConfigModeAdvanced && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-text-primary block">
                        {t('videoEncoder')}
                      </label>
                      <button
                        type="button"
                        onClick={handleFetchEncoders}
                        disabled={isLoadingEncoders}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingEncoders ? 'animate-spin' : ''}`} />
                        List Encoders
                      </button>
                    </div>

                    <input
                      type="text"
                      value={config.videoEncoder || ''}
                      onChange={(e) => updateConfig({ videoEncoder: e.target.value })}
                      placeholder="Auto (e.g. c2.android.avc.encoder)"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary"
                    />

                    {encoders.length > 0 && (
                      <div className="max-h-24 overflow-y-auto space-y-1 p-1 bg-surface rounded border border-border">
                        {encoders
                          .filter((e) => e.mediaType === 'video')
                          .map((enc) => (
                            <button
                              key={enc.encoderName}
                              type="button"
                              onClick={() =>
                                updateConfig({
                                  videoEncoder: enc.encoderName,
                                  videoCodec: enc.codec as VideoCodec,
                                })
                              }
                              className="w-full text-left px-2 py-1 rounded text-[11px] font-mono hover:bg-surface-hover flex items-center justify-between text-text-secondary hover:text-text-primary"
                            >
                              <span className="truncate">{enc.encoderName}</span>
                              <span className="text-[10px] text-primary shrink-0 ml-1">
                                {enc.codec}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Buffer */}
                {isConfigModeAdvanced && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-text-primary block">
                      {t('videoBuffer')}
                    </label>
                    <input
                      type="number"
                      value={config.videoBuffer || 0}
                      onChange={(e) => updateConfig({ videoBuffer: Number(e.target.value) })}
                      placeholder="0 (no buffer)"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Advanced Flags (scrcpy 4.1) */}
              {isConfigModeAdvanced && (
                <div className="pt-4 border-t border-border flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary hover:text-text-primary">
                    <input
                      type="checkbox"
                      checked={config.ignoreVideoEncoderConstraints || false}
                      onChange={(e) =>
                        updateConfig({ ignoreVideoEncoderConstraints: e.target.checked })
                      }
                      className="rounded bg-surface border-border text-primary focus:ring-0"
                    />
                    <span>{t('ignoreConstraints')}</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border">
                <div>
                  <span className="text-xs font-semibold text-text-primary block">
                    {t('forwardAudio')}
                  </span>
                  <span className="text-[11px] text-text-muted mt-0.5 block">
                    Forward device sound to computer speakers (requires Android 11+)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.audioEnabled !== false}
                  onChange={(e) => updateConfig({ audioEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-primary focus:ring-0"
                />
              </div>

              {config.audioEnabled !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-text-primary block">
                      {t('audioSource')}
                    </label>
                    <select
                      value={config.audioSource || 'output'}
                      onChange={(e) =>
                        updateConfig({ audioSource: e.target.value as any })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="output">Output (Standard device playback)</option>
                      <option value="playback">Playback (Apps playback only)</option>
                      <option value="mic">Microphone</option>
                      <option value="voice-call">Voice Call</option>
                      <option value="voice-performance">Performance / Karaoke</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-text-primary block">
                      {t('audioCodec')}
                    </label>
                    <select
                      value={config.audioCodec || 'opus'}
                      onChange={(e) =>
                        updateConfig({ audioCodec: e.target.value as AudioCodec })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="opus">Opus (Recommended)</option>
                      <option value="aac">AAC</option>
                      <option value="flac">FLAC (Lossless)</option>
                      <option value="raw">RAW PCM</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-text-primary block">
                      {t('audioBitrate')}
                    </label>
                    <select
                      value={config.audioBitrate || '128K'}
                      onChange={(e) => updateConfig({ audioBitrate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="64K">64 Kbps</option>
                      <option value="128K">128 Kbps (Default)</option>
                      <option value="192K">192 Kbps (High Quality)</option>
                      <option value="256K">256 Kbps</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INPUT & CONTROL TAB */}
          {activeTab === 'input' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('keyboardMode')}
                  </label>
                  <select
                    value={config.keyboardMode || 'sdk'}
                    onChange={(e) =>
                      updateConfig({ keyboardMode: e.target.value as InputMode })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="sdk">SDK (Standard Android API)</option>
                    <option value="uhid">UHID (Simulate physical HID keyboard)</option>
                    <option value="aoa">AOA (AOAv2 USB protocol)</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('mouseMode')}
                  </label>
                  <select
                    value={config.mouseMode || 'sdk'}
                    onChange={(e) =>
                      updateConfig({ mouseMode: e.target.value as InputMode })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="sdk">SDK (Standard Touch/Mouse)</option>
                    <option value="uhid">UHID (Physical USB Mouse)</option>
                    <option value="aoa">AOA (AOAv2 Mouse)</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('gamepadMode')}
                  </label>
                  <select
                    value={config.gamepadMode || 'disabled'}
                    onChange={(e) =>
                      updateConfig({ gamepadMode: e.target.value as GamepadMode })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="disabled">Disabled</option>
                    <option value="uhid">UHID (Simulate Gamepad)</option>
                    <option value="aoa">AOA (AOAv2 Gamepad)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.turnScreenOff || false}
                    onChange={(e) => updateConfig({ turnScreenOff: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">
                      {t('turnScreenOffOnStart')}
                    </span>
                    <span className="text-[10px] text-text-muted block">Saves phone battery</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.stayAwake !== false}
                    onChange={(e) => updateConfig({ stayAwake: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">
                      {t('stayAwake')}
                    </span>
                    <span className="text-[10px] text-text-muted block">Prevent device sleep</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showTouches || false}
                    onChange={(e) => updateConfig({ showTouches: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">
                      {t('showTouches')}
                    </span>
                    <span className="text-[10px] text-text-muted block">Draw touch circles</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.clipboardAutosync !== false}
                    onChange={(e) => updateConfig({ clipboardAutosync: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">
                      {t('clipboardAutosync')}
                    </span>
                    <span className="text-[10px] text-text-muted block">Sync Ctrl+C / Ctrl+V</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.legacyPaste || false}
                    onChange={(e) => updateConfig({ legacyPaste: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">
                      {t('legacyPaste')}
                    </span>
                    <span className="text-[10px] text-text-muted block">Inject keystrokes for paste</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* WINDOW TAB */}
          {activeTab === 'window' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.fullscreen || false}
                    onChange={(e) => updateConfig({ fullscreen: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-text-primary">{t('fullscreen')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.alwaysOnTop || false}
                    onChange={(e) => updateConfig({ alwaysOnTop: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-text-primary">{t('alwaysOnTop')}</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.windowBorderless || false}
                    onChange={(e) => updateConfig({ windowBorderless: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-text-primary">{t('borderless')}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('windowTitle')}
                  </label>
                  <input
                    type="text"
                    value={config.windowTitle || ''}
                    onChange={(e) => updateConfig({ windowTitle: e.target.value })}
                    placeholder="Scrcpy Studio Mirror"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-primary block">
                    {t('renderFit')}
                  </label>
                  <select
                    value={config.renderFit || 'letterbox'}
                    onChange={(e) => updateConfig({ renderFit: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="letterbox">Letterbox (Preserve aspect ratio)</option>
                    <option value="stretched">Stretched (Fill window)</option>
                    <option value="unscaled">Unscaled (1:1 pixel rendering)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ADVANCED TAB */}
          {activeTab === 'advanced' && isConfigModeAdvanced && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-text-primary mb-1">
                  Custom Raw scrcpy Arguments
                </h4>
                <p className="text-xs text-text-secondary mb-4">
                  Add additional arguments passed directly to the scrcpy command line.
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={customArgInput}
                    onChange={(e) => setCustomArgInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomArg()}
                    placeholder="e.g. --display-buffer=50 or --crop=1080:2000:0:100"
                    className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addCustomArg}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
                  >
                    Add Arg
                  </button>
                </div>

                {config.customArgs && config.customArgs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {config.customArgs.map((arg, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-mono text-cyan-400"
                      >
                        <span>{arg}</span>
                        <button
                          onClick={() => removeCustomArg(idx)}
                          className="hover:text-rose-400 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Generated Command Box */}
      <CommandPreview onRun={() => startSession()} />
    </div>
  );
};
