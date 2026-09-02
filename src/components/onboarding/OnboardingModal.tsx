import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Search,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTranslation } from '@/lib/i18n';

export const OnboardingModal: React.FC = () => {
  const { t, tf } = useTranslation();
  const {
    settings,
    detection,
    isDetecting,
    isHydrated,
    runtimeError,
    detectExecutables,
    setCustomScrcpyPath,
    setCustomAdbPath,
    updateSettings,
  } = useSettingsStore();

  const [step, setStep] = useState<1 | 2>(1);

  if (!isHydrated || settings.hasCompletedOnboarding) return null;

  const handleBrowseScrcpy = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: t('executableFile'), extensions: ['exe'] }],
      });
      if (selected && typeof selected === 'string') {
        await setCustomScrcpyPath(selected);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleBrowseAdb = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: t('executableFile'), extensions: ['exe'] }],
      });
      if (selected && typeof selected === 'string') {
        await setCustomAdbPath(selected);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleFinish = () => {
    updateSettings({ hasCompletedOnboarding: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="w-full max-w-xl bg-card border border-border-highlight rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="onboarding-title" className="text-base font-bold text-text-primary">{t('onboardingWelcome')}</h2>
              <p className="text-xs text-text-secondary">{tf('onboardingStep', { step })}</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-surface border border-border text-primary">
            {tf('scrcpyVersionReady', { version: '4.1' })}
          </span>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary">{t('toolchainVerification')}</h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">{t('toolchainRequirement')}</p>
            </div>

            <div className="space-y-3">
              {/* Scrcpy Path Item */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">{t('scrcpyExecutable')}</span>
                  {detection?.isScrcpyReady ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {tf('detectedVersion', { version: detection.scrcpyVersion ?? t('unknown') })}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> {t('notFound')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={settings.scrcpyPath}
                    placeholder={tf('executableNotFound', { name: 'scrcpy' })}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-text-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => void handleBrowseScrcpy()}
                    className="px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs border border-border font-medium"
                  >
                    {t('browse')}
                  </button>
                </div>
              </div>

              {/* ADB Path Item */}
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">{t('adbExecutable')}</span>
                  {detection?.isAdbReady ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {tf('detectedVersion', { version: detection.adbVersion ?? t('unknown') })}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> {t('notFound')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={settings.adbPath}
                    placeholder={tf('executableNotFound', { name: 'adb' })}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-text-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => void handleBrowseAdb()}
                    className="px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-text-secondary text-xs border border-border font-medium"
                  >
                    {t('browse')}
                  </button>
                </div>
              </div>
            </div>

            {runtimeError && (
              <p role="alert" className="text-xs text-rose-400 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
                {runtimeError}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => void detectExecutables()}
                disabled={isDetecting}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isDetecting ? t('scanningRuntime') : t('autoDetectAgain')}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-md transition-all transform active:scale-95"
              >
                <span>{t('continue')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary">{t('enableUsbDebugging')}</h3>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                {t('usbDebuggingIntro')}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-center">
                <div className="w-8 h-8 rounded-full bg-primary-light text-primary font-bold text-xs flex items-center justify-center mx-auto">
                  1
                </div>
                <span className="text-xs font-bold text-text-primary block">{t('developerOptions')}</span>
                <p className="text-[11px] text-text-muted">{t('developerOptionsStep')}</p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-center">
                <div className="w-8 h-8 rounded-full bg-primary-light text-primary font-bold text-xs flex items-center justify-center mx-auto">
                  2
                </div>
                <span className="text-xs font-bold text-text-primary block">{t('usbDebugging')}</span>
                <p className="text-[11px] text-text-muted">{t('usbDebuggingStep')}</p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-2 text-center">
                <div className="w-8 h-8 rounded-full bg-primary-light text-primary font-bold text-xs flex items-center justify-center mx-auto">
                  3
                </div>
                <span className="text-xs font-bold text-text-primary block">{t('authorizePc')}</span>
                <p className="text-[11px] text-text-muted">{t('authorizePcStep')}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-text-secondary hover:text-text-primary font-medium"
              >
                {t('back')}
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all transform active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{t('getStarted')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
