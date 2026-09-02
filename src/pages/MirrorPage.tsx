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
import { buildScrcpyArgs, SMART_PRESETS } from '@/lib/commandBuilder';
import {
  getScrcpyOptionKey,
  validateCustomArgument,
} from '@/lib/scrcpyConfig';
import { CommandPreview } from '@/components/common/CommandPreview';
import {
  EncoderInfoItem,
  VideoCodec,
  AudioCodec,
  AudioSource,
  InputMode,
  GamepadMode,
  RenderFit,
} from '@/types/scrcpy';

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
  const [customArgError, setCustomArgError] = useState<string | null>(null);
  const [isExpertMode, setIsExpertMode] = useState(false);

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
    const argument = customArgInput.trim();
    const validationError = validateCustomArgument(argument);
    if (validationError) {
      setCustomArgError(validationError);
      return;
    }
    const current = config.customArgs || [];
    const optionKey = getScrcpyOptionKey(argument);
    const typedOptionKeys = new Set(
      buildScrcpyArgs({ ...config, customArgs: [] })
        .filter((item) => item.startsWith('--'))
        .map(getScrcpyOptionKey)
    );
    if (typedOptionKeys.has(optionKey)) {
      setCustomArgError(`This option is already configured by a typed setting: ${optionKey}`);
      return;
    }
    if (current.some((item) => getScrcpyOptionKey(item) === optionKey)) {
      setCustomArgError(`Duplicate custom option: ${optionKey}`);
      return;
    }
    updateConfig({ customArgs: [...current, argument] });
    setCustomArgError(null);
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
            type="button"
            onClick={() => {
              setConfigModeAdvanced(false);
              setIsExpertMode(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isConfigModeAdvanced
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('basicMode')}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfigModeAdvanced(true);
              setIsExpertMode(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isConfigModeAdvanced && !isExpertMode
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('advancedMode')}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfigModeAdvanced(true);
              setIsExpertMode(true);
              setActiveTab('advanced');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isExpertMode
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('expertMode')}
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
                  {preset.config.maxSize ? `${preset.config.maxSize}p` : t('nativeResolution')} • {preset.config.maxFps || 60}FPS
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
                    <option value="h264">{t('codecH264Option')}</option>
                    <option value="h265">{t('codecH265Option')}</option>
                    <option value="av1">{t('codecAv1Option')}</option>
                    <option value="vp8">{t('codecVp8Option')}</option>
                    <option value="vp9">{t('codecVp9Option')}</option>
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
                    <option value={0}>{t('nativeDeviceResolution')}</option>
                    <option value={2560}>{t('resolution2k')}</option>
                    <option value={1920}>{t('resolutionFullHd')}</option>
                    <option value={1600}>{t('resolutionBalanced')}</option>
                    <option value={1280}>{t('resolutionHd')}</option>
                    <option value={1024}>{t('resolutionFast')}</option>
                    <option value={800}>{t('resolutionLowEnd')}</option>
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
                        {t('listEncoders')}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={config.videoEncoder || ''}
                      onChange={(e) => updateConfig({ videoEncoder: e.target.value })}
                      placeholder={t('encoderAutoPlaceholder')}
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
                      placeholder={t('noBufferPlaceholder')}
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
                    {t('forwardAudioDescription')}
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
                        updateConfig({ audioSource: e.target.value as AudioSource })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                    >
                      <option value="output">{t('audioOutputSource')}</option>
                      <option value="playback">{t('audioPlaybackSource')}</option>
                      <option value="mic">{t('microphone')}</option>
                      <option value="mic-unprocessed">{t('microphoneUnprocessed')}</option>
                      <option value="mic-camcorder">{t('microphoneCamcorder')}</option>
                      <option value="mic-voice-recognition">{t('microphoneVoiceRecognition')}</option>
                      <option value="mic-voice-communication">{t('microphoneVoiceCommunication')}</option>
                      <option value="voice-call">{t('voiceCall')}</option>
                      <option value="voice-call-uplink">{t('voiceCallUplink')}</option>
                      <option value="voice-call-downlink">{t('voiceCallDownlink')}</option>
                      <option value="voice-performance">{t('voicePerformance')}</option>
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
                      <option value="opus">Opus ({t('recommended')})</option>
                      <option value="aac">AAC</option>
                      <option value="flac">FLAC ({t('lossless')})</option>
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
                      <option value="128K">128 Kbps ({t('defaultLabel')})</option>
                      <option value="192K">192 Kbps ({t('highQuality')})</option>
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
                    <option value="sdk">{t('sdkKeyboardMode')}</option>
                    <option value="uhid">{t('uhidKeyboardMode')}</option>
                    <option value="aoa">{t('aoaKeyboardMode')}</option>
                    <option value="disabled">{t('disabled')}</option>
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
                    <option value="sdk">{t('sdkMouseMode')}</option>
                    <option value="uhid">{t('uhidMouseMode')}</option>
                    <option value="aoa">{t('aoaMouseMode')}</option>
                    <option value="disabled">{t('disabled')}</option>
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
                    <option value="disabled">{t('disabled')}</option>
                    <option value="uhid">{t('uhidGamepadMode')}</option>
                    <option value="aoa">{t('aoaGamepadMode')}</option>
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
                    <span className="text-[10px] text-text-muted block">{t('savesPhoneBattery')}</span>
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
                    <span className="text-[10px] text-text-muted block">{t('preventsDeviceSleep')}</span>
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
                    <span className="text-[10px] text-text-muted block">{t('drawsTouchCircles')}</span>
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
                    <span className="text-[10px] text-text-muted block">{t('syncClipboardShortcut')}</span>
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
                    <span className="text-[10px] text-text-muted block">{t('injectPasteKeystrokes')}</span>
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
                    onChange={(e) => updateConfig({ renderFit: e.target.value as RenderFit })}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="letterbox">{t('renderLetterbox')}</option>
                    <option value="stretched">{t('renderStretched')}</option>
                    <option value="unscaled">{t('renderUnscaled')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ADVANCED TAB */}
          {activeTab === 'advanced' && isConfigModeAdvanced && (
            <div className="space-y-6">
              {isExpertMode && (
                <div className="space-y-5 pb-6 border-b border-border">
                  <div>
                    <h4 className="text-xs font-semibold text-text-primary mb-1">
                      {t('expertOptions')}
                    </h4>
                    <p className="text-xs text-text-secondary">
                      {t('expertOptionsDescription')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('videoCodecOptions')}</span>
                      <input
                        type="text"
                        value={config.videoCodecOptions ?? ''}
                        onChange={(event) => updateConfig({ videoCodecOptions: event.target.value })}
                        placeholder="profile:long=1,level=2"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('audioCodecOptions')}</span>
                      <input
                        type="text"
                        value={config.audioCodecOptions ?? ''}
                        onChange={(event) => updateConfig({ audioCodecOptions: event.target.value })}
                        placeholder="bitrate-mode:int=2"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('audioOutputBuffer')}</span>
                      <input
                        type="number"
                        min={0}
                        value={config.audioOutputBuffer ?? 10}
                        onChange={(event) => updateConfig({ audioOutputBuffer: Number(event.target.value) })}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('screenOffTimeout')}</span>
                      <input
                        type="number"
                        min={0}
                        value={config.screenOffTimeout ?? ''}
                        onChange={(event) =>
                          updateConfig({
                            screenOffTimeout: event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                        placeholder="300"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('displayImePolicy')}</span>
                      <select
                        value={config.displayImePolicy ?? ''}
                        onChange={(event) =>
                          updateConfig({
                            displayImePolicy:
                              event.target.value === ''
                                ? undefined
                                : (event.target.value as 'local' | 'fallback' | 'hide'),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border focus:outline-none focus:border-primary"
                      >
                        <option value="">{t('displayImeDefault')}</option>
                        <option value="local">{t('displayImeLocal')}</option>
                        <option value="fallback">{t('displayImeFallback')}</option>
                        <option value="hide">{t('displayImeHide')}</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('mouseBind')}</span>
                      <input
                        type="text"
                        value={config.mouseBind ?? ''}
                        onChange={(event) => updateConfig({ mouseBind: event.target.value })}
                        placeholder="bhsn:++++"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('shortcutMod')}</span>
                      <input
                        type="text"
                        value={config.shortcutMod ?? ''}
                        onChange={(event) => updateConfig({ shortcutMod: event.target.value })}
                        placeholder="lalt,lsuper"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('backgroundColor')}</span>
                      <input
                        type="text"
                        value={config.backgroundColor ?? ''}
                        onChange={(event) => updateConfig({ backgroundColor: event.target.value })}
                        placeholder="#222222"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('tunnelHost')}</span>
                      <input
                        type="text"
                        value={config.tunnelHost ?? ''}
                        onChange={(event) => updateConfig({ tunnelHost: event.target.value })}
                        placeholder="127.0.0.1"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs text-text-secondary">
                      <span className="font-semibold text-text-primary">{t('tunnelPort')}</span>
                      <input
                        type="number"
                        min={1}
                        max={65535}
                        value={config.tunnelPort ?? ''}
                        onChange={(event) =>
                          updateConfig({
                            tunnelPort: event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                        placeholder="27183"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border font-mono focus:outline-none focus:border-primary"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {([
                      ['keepActive', 'keepActive'],
                      ['noMouseHover', 'disableMouseHover'],
                      ['noWindow', 'disableScrcpyWindow'],
                      ['noWindowAspectRatioLock', 'disableAspectRatioLock'],
                      ['noMipmaps', 'disableMipmaps'],
                      ['noDownsizeOnError', 'disableDownsizeOnError'],
                      ['noCleanup', 'disableCleanup'],
                      ['noVideoPlayback', 'disableVideoPlayback'],
                      ['noAudioPlayback', 'disableAudioPlayback'],
                    ] as const).map(([key, labelKey]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer text-xs text-text-primary"
                      >
                        <input
                          type="checkbox"
                          checked={config[key] === true}
                          onChange={(event) => updateConfig({ [key]: event.target.checked })}
                          className="rounded text-primary focus:ring-0"
                        />
                        <span>{t(labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-text-primary mb-1">
                  {t('customArguments')}
                </h4>
                <p className="text-xs text-text-secondary mb-4">
                  {t('customArgumentsDescription')}
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={customArgInput}
                    onChange={(e) => {
                      setCustomArgInput(e.target.value);
                      setCustomArgError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomArg()}
                    placeholder="--no-mipmaps"
                    aria-invalid={customArgError !== null}
                    aria-describedby="custom-argument-error"
                    className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addCustomArg}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold"
                  >
                    {t('addArgument')}
                  </button>
                </div>

                {customArgError && (
                  <p id="custom-argument-error" role="alert" className="text-xs text-rose-400 mb-3">
                    {customArgError}
                  </p>
                )}

                {config.customArgs && config.customArgs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {config.customArgs.map((arg, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface border border-border text-xs font-mono text-cyan-400"
                      >
                        <span>{arg}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomArg(idx)}
                          aria-label={`${t('removeArgument')} ${arg}`}
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
