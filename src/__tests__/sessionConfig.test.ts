import { describe, expect, it } from 'vitest';
import { resolveSessionConfig } from '../lib/sessionConfig';
import type { ScrcpyConfig } from '../types/scrcpy';

const transientConfig: ScrcpyConfig = {
  maxSize: 1600,
  maxFps: 60,
  serial: 'current-device',
  otgMode: true,
  camera: { enabled: true, cameraFacing: 'front', cameraFps: 30 },
  virtualDisplay: { enabled: true, resolution: '1920x1080' },
  recordPath: 'old-recording.mp4',
  recordFormat: 'mp4',
  recordOrientation: '90',
  noPlayback: true,
};

describe('resolveSessionConfig', () => {
  it('merges one-off overrides without mutating the inputs', () => {
    const current: ScrcpyConfig = { maxSize: 1600, maxFps: 60 };
    const overrides: Partial<ScrcpyConfig> = { maxFps: 120, turnScreenOff: true };

    const result = resolveSessionConfig(current, overrides, 'selected-device', 'mirror');

    expect(result).toEqual({
      maxSize: 1600,
      maxFps: 120,
      turnScreenOff: true,
      serial: 'selected-device',
    });
    expect(current).toEqual({ maxSize: 1600, maxFps: 60 });
    expect(overrides).toEqual({ maxFps: 120, turnScreenOff: true });
  });

  it('prefers an explicit override serial over the selected and current serials', () => {
    expect(
      resolveSessionConfig(
        { serial: 'current-device' },
        { serial: 'override-device' },
        'selected-device',
        'mirror'
      ).serial
    ).toBe('override-device');

    expect(
      resolveSessionConfig({ serial: 'current-device' }, undefined, 'selected-device', 'mirror')
        .serial
    ).toBe('selected-device');

    expect(resolveSessionConfig({ serial: 'current-device' }, undefined, null, 'mirror').serial).toBe(
      'current-device'
    );

    expect(
      resolveSessionConfig({ serial: 'current-device' }, { serial: '   ' }, 'selected-device', 'mirror')
        .serial
    ).toBe('selected-device');
  });

  it('clears every transient field for a regular mirror session', () => {
    const result = resolveSessionConfig(transientConfig, undefined, null, 'mirror');

    expect(result).toEqual({
      maxSize: 1600,
      maxFps: 60,
      serial: 'current-device',
    });
  });

  it('enables only OTG mode', () => {
    const result = resolveSessionConfig(transientConfig, undefined, null, 'otg');

    expect(result).toMatchObject({ otgMode: true, maxSize: 1600 });
    expect(result.camera).toBeUndefined();
    expect(result.virtualDisplay).toBeUndefined();
    expect(result.recordPath).toBeUndefined();
  });

  it('enables only camera mode and forces the camera configuration on', () => {
    const result = resolveSessionConfig(
      transientConfig,
      { camera: { enabled: false, cameraFacing: 'back', cameraFps: 60 } },
      null,
      'camera'
    );

    expect(result.camera).toEqual({ enabled: true, cameraFacing: 'back', cameraFps: 60 });
    expect(result.otgMode).toBeUndefined();
    expect(result.virtualDisplay).toBeUndefined();
    expect(result.recordPath).toBeUndefined();
  });

  it('keeps explicit recording options for a camera recording', () => {
    const result = resolveSessionConfig(
      transientConfig,
      {
        camera: { enabled: true, cameraFacing: 'front' },
        recordPath: 'camera-recording.mp4',
        recordFormat: 'mp4',
        noPlayback: true,
      },
      null,
      'camera'
    );

    expect(result.camera).toEqual({ enabled: true, cameraFacing: 'front' });
    expect(result.recordPath).toBe('camera-recording.mp4');
    expect(result.recordFormat).toBe('mp4');
    expect(result.noPlayback).toBe(true);
  });

  it('enables only virtual-display mode and forces the display configuration on', () => {
    const result = resolveSessionConfig(
      transientConfig,
      { virtualDisplay: { enabled: false, resolution: '1280x720', dpi: 240 } },
      null,
      'virtual_display'
    );

    expect(result.virtualDisplay).toEqual({
      enabled: true,
      resolution: '1280x720',
      dpi: 240,
    });
    expect(result.otgMode).toBeUndefined();
    expect(result.camera).toBeUndefined();
    expect(result.recordPath).toBeUndefined();
  });

  it('keeps only recording fields for record mode, including an explicit false value', () => {
    const result = resolveSessionConfig(
      transientConfig,
      {
        recordPath: 'new-recording.mkv',
        recordFormat: 'mkv',
        recordOrientation: '180',
        noPlayback: false,
      },
      null,
      'record'
    );

    expect(result).toMatchObject({
      recordPath: 'new-recording.mkv',
      recordFormat: 'mkv',
      recordOrientation: '180',
      noPlayback: false,
    });
    expect(result.otgMode).toBeUndefined();
    expect(result.camera).toBeUndefined();
    expect(result.virtualDisplay).toBeUndefined();
  });
});
