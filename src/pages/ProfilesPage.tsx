import React, { useState } from 'react';
import {
  Bookmark,
  Plus,
  Play,
  Copy,
  Trash2,
  Star,
  Sparkles,
  Film,
  Gamepad2,
  Sliders,
  Wifi,
  BatteryCharging,
  Tv,
  Cpu,
  X,
} from 'lucide-react';
import { useProfileStore } from '@/stores/useProfileStore';
import { useScrcpyStore } from '@/stores/useScrcpyStore';
import { useTranslation } from '@/lib/i18n';
import { ScrcpyProfile } from '@/types/profile';
import { VideoCodec } from '@/types/scrcpy';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Film,
  Gamepad2,
  Sliders,
  Wifi,
  BatteryCharging,
  Tv,
  Cpu,
  Bookmark,
};

export const ProfilesPage: React.FC = () => {
  const { t } = useTranslation();
  const { profiles, addProfile, deleteProfile, duplicateProfile, toggleFavorite } =
    useProfileStore();
  const { applyPreset, startSession, config } = useScrcpyStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  const [newCodec, setNewCodec] = useState<VideoCodec>('h264');
  const [newMaxSize, setNewMaxSize] = useState(1600);
  const [newFps, setNewFps] = useState(60);
  const [newBitrate, setNewBitrate] = useState('8M');

  const handleLaunch = (profile: ScrcpyProfile) => {
    applyPreset(profile);
    startSession(profile.config);
  };

  const handleCreate = () => {
    if (!newProfileName.trim()) return;
    addProfile({
      name: newProfileName.trim(),
      description: newProfileDesc.trim() || 'Custom profile',
      iconName: 'Bookmark',
      config: {
        ...config,
        videoCodec: newCodec,
        maxSize: newMaxSize,
        maxFps: newFps,
        videoBitrate: newBitrate,
      },
    });

    setNewProfileName('');
    setNewProfileDesc('');
    setIsCreateModalOpen(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {t('profilesTitle')}
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            {t('profilesSubtext')}
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('createProfile')}</span>
        </button>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((prof) => {
          const Icon = ICON_MAP[prof.iconName] || Bookmark;
          return (
            <div
              key={prof.id}
              className="p-5 rounded-2xl bg-card hover:bg-card-hover border border-border hover:border-border-highlight transition-all duration-150 flex flex-col justify-between space-y-4 group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-hover group-hover:bg-primary-light flex items-center justify-center text-text-secondary group-hover:text-primary transition-colors border border-border">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFavorite(prof.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        prof.isFavorite
                          ? 'text-amber-400'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                      title="Favorite"
                    >
                      <Star className={`w-4 h-4 ${prof.isFavorite ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      onClick={() => duplicateProfile(prof.id)}
                      className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary"
                      title={t('duplicateProfile')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {!prof.isBuiltIn && (
                      <button
                        onClick={() => deleteProfile(prof.id)}
                        className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-rose-400"
                        title={t('deleteProfile')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-text-primary">{prof.name}</h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">
                  {prof.description}
                </p>
              </div>

              {/* Specs Pills */}
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-text-muted">
                <span className="px-2 py-0.5 rounded bg-surface border border-border">
                  {prof.config.maxSize ? `${prof.config.maxSize}p` : 'Native'}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-border">
                  {prof.config.maxFps || 60} FPS
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-border uppercase">
                  {prof.config.videoCodec || 'h264'}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-border">
                  {prof.config.videoBitrate || '8M'}
                </span>
              </div>

              {/* Launch Button */}
              <button
                onClick={() => handleLaunch(prof)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all transform active:scale-98"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('launchProfile')}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Profile Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-surface border border-border-highlight rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">{t('createProfile')}</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">
                  {t('profileName')}
                </label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. 4K Cinema Mirror"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">
                  {t('profileDescription')}
                </label>
                <input
                  type="text"
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  placeholder="e.g. Ultra high bitrate for presentation"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">
                    {t('resolution')}
                  </label>
                  <select
                    value={newMaxSize}
                    onChange={(e) => setNewMaxSize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                  >
                    <option value={0}>Native</option>
                    <option value={2560}>2560p</option>
                    <option value={1920}>1920p</option>
                    <option value={1600}>1600p</option>
                    <option value={1280}>1280p</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">
                    {t('frameRate')}
                  </label>
                  <select
                    value={newFps}
                    onChange={(e) => setNewFps(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                  >
                    <option value={30}>30 FPS</option>
                    <option value={60}>60 FPS</option>
                    <option value={90}>90 FPS</option>
                    <option value={120}>120 FPS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Video codec</label>
                  <select
                    value={newCodec}
                    onChange={(e) => setNewCodec(e.target.value as VideoCodec)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                  >
                    <option value="h264">H.264</option>
                    <option value="h265">H.265 / HEVC</option>
                    <option value="av1">AV1</option>
                    <option value="vp8">VP8</option>
                    <option value="vp9">VP9</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Video bitrate</label>
                  <select
                    value={newBitrate}
                    onChange={(e) => setNewBitrate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                  >
                    {['2M', '4M', '8M', '12M', '16M', '24M', '32M'].map((bitrate) => (
                      <option key={bitrate} value={bitrate}>
                        {bitrate}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newProfileName.trim()}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
