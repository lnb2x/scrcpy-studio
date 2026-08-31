import type { ScrcpyConfig } from '@/types/scrcpy';

export type SessionMode = 'mirror' | 'otg' | 'camera' | 'record' | 'virtual_display';

const TRANSIENT_CONFIG_KEYS = [
  'otgMode',
  'camera',
  'virtualDisplay',
  'recordPath',
  'recordFormat',
  'recordOrientation',
  'noPlayback',
] as const satisfies readonly (keyof ScrcpyConfig)[];

/**
 * Builds the effective configuration for one launch without mutating or
 * contaminating the persisted editor configuration with mode-specific flags.
 */
export function resolveSessionConfig(
  current: ScrcpyConfig,
  overrides: Partial<ScrcpyConfig> | undefined,
  selectedSerial: string | null | undefined,
  mode: SessionMode
): ScrcpyConfig {
  const oneOffOverrides = overrides ?? {};
  const merged: ScrcpyConfig = { ...current, ...oneOffOverrides };
  const serial =
    oneOffOverrides.serial?.trim() || selectedSerial?.trim() || current.serial?.trim() || undefined;

  const resolved: ScrcpyConfig = { ...merged };
  for (const key of TRANSIENT_CONFIG_KEYS) {
    delete resolved[key];
  }

  if (serial !== undefined) {
    resolved.serial = serial;
  } else {
    delete resolved.serial;
  }

  switch (mode) {
    case 'otg':
      resolved.otgMode = true;
      break;

    case 'camera':
      resolved.camera = {
        ...oneOffOverrides.camera,
        enabled: true,
      };
      if (oneOffOverrides.recordPath !== undefined) {
        resolved.recordPath = oneOffOverrides.recordPath;
        if (oneOffOverrides.recordFormat !== undefined) {
          resolved.recordFormat = oneOffOverrides.recordFormat;
        }
        if (oneOffOverrides.recordOrientation !== undefined) {
          resolved.recordOrientation = oneOffOverrides.recordOrientation;
        }
        if (oneOffOverrides.noPlayback !== undefined) {
          resolved.noPlayback = oneOffOverrides.noPlayback;
        }
      }
      break;

    case 'virtual_display':
      resolved.virtualDisplay = {
        ...oneOffOverrides.virtualDisplay,
        enabled: true,
      };
      break;

    case 'record':
      if (oneOffOverrides.recordPath !== undefined) resolved.recordPath = oneOffOverrides.recordPath;
      if (oneOffOverrides.recordFormat !== undefined) {
        resolved.recordFormat = oneOffOverrides.recordFormat;
      }
      if (oneOffOverrides.recordOrientation !== undefined) {
        resolved.recordOrientation = oneOffOverrides.recordOrientation;
      }
      if (oneOffOverrides.noPlayback !== undefined) resolved.noPlayback = oneOffOverrides.noPlayback;
      break;

    case 'mirror':
      break;
  }

  return resolved;
}
