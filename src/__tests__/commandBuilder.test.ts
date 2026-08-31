import { describe, it, expect } from 'vitest';
import { buildScrcpyArgs, formatCommandString } from '../lib/commandBuilder';
import { ScrcpyConfig } from '../types/scrcpy';

describe('Scrcpy Command Builder for scrcpy 4.1', () => {
  it('should build basic balanced mirror command', () => {
    const config: ScrcpyConfig = {
      serial: 'emulator-5554',
      videoCodec: 'h264',
      maxSize: 1600,
      maxFps: 60,
      videoBitrate: '8M',
      audioEnabled: true,
      controlEnabled: true,
      stayAwake: true,
    };

    const args = buildScrcpyArgs(config);
    expect(args).toContain('--serial');
    expect(args).toContain('emulator-5554');
    expect(args).toContain('--max-size=1600');
    expect(args).toContain('--max-fps=60');
    expect(args).toContain('--video-bit-rate=8M');
    expect(args).toContain('--stay-awake');
  });

  it('should build ultra quality H.265 with high FPS and bitrate', () => {
    const config: ScrcpyConfig = {
      serial: '24691xxxx',
      videoCodec: 'h265',
      maxSize: 2560,
      maxFps: 120,
      videoBitrate: '24M',
      ignoreVideoEncoderConstraints: true,
      turnScreenOff: true,
    };

    const args = buildScrcpyArgs(config);
    expect(args).toContain('--video-codec=h265');
    expect(args).toContain('--max-size=2560');
    expect(args).toContain('--max-fps=120');
    expect(args).toContain('--video-bit-rate=24M');
    expect(args).toContain('--ignore-video-encoder-constraints');
    expect(args).toContain('--turn-screen-off');
  });

  it('should build scrcpy 4.1 VP9 and VP8 video codec options', () => {
    const configVp9: ScrcpyConfig = {
      videoCodec: 'vp9',
      maxSize: 1920,
    };
    expect(buildScrcpyArgs(configVp9)).toContain('--video-codec=vp9');

    const configVp8: ScrcpyConfig = {
      videoCodec: 'vp8',
    };
    expect(buildScrcpyArgs(configVp8)).toContain('--video-codec=vp8');
  });

  it('should correctly configure OTG mode ignoring video/audio mirroring', () => {
    const config: ScrcpyConfig = {
      serial: 'USB_DEV_001',
      otgMode: true,
      keyboardMode: 'uhid',
      mouseMode: 'uhid',
      gamepadMode: 'aoa',
      videoCodec: 'h265', // should be ignored in OTG
      audioEnabled: true,  // should be ignored in OTG
    };

    const args = buildScrcpyArgs(config);
    expect(args).toContain('--otg');
    expect(args).toContain('--keyboard=uhid');
    expect(args).toContain('--mouse=uhid');
    expect(args).toContain('--gamepad=aoa');
    expect(args).not.toContain('--video-codec=h265');
    expect(args).not.toContain('--no-audio');
  });

  it('should build camera mirroring arguments for Android 12+', () => {
    const config: ScrcpyConfig = {
      serial: 'pixel7_serial',
      camera: {
        enabled: true,
        cameraFacing: 'front',
        cameraSize: '1920x1080',
        cameraFps: 60,
        cameraTorch: true,
        cameraZoom: 1.5,
      },
    };

    const args = buildScrcpyArgs(config);
    expect(args).toContain('--video-source=camera');
    expect(args).toContain('--camera-facing=front');
    expect(args).toContain('--camera-size=1920x1080');
    expect(args).toContain('--camera-fps=60');
    expect(args).toContain('--camera-torch');
    expect(args).toContain('--camera-zoom=1.5');
  });

  it('should avoid mutually exclusive camera arguments', () => {
    const args = buildScrcpyArgs({
      maxSize: 1600,
      audioSource: 'output',
      camera: {
        enabled: true,
        cameraId: ' 0 ',
        cameraFacing: 'front',
        cameraSize: '1920x1080',
        cameraAr: '16:9',
      },
    });

    expect(args).toContain('--camera-id=0');
    expect(args).toContain('--camera-size=1920x1080');
    expect(args).toContain('--audio-source=output');
    expect(args).not.toContain('--camera-facing=front');
    expect(args).not.toContain('--camera-ar=16:9');
    expect(args).not.toContain('--max-size=1600');
  });

  it('should build Android virtual display arguments', () => {
    const config: ScrcpyConfig = {
      serial: 'tab_s8',
      virtualDisplay: {
        enabled: true,
        resolution: '1920x1080',
        dpi: 320,
        flexDisplay: true,
        startApp: 'com.android.chrome',
      },
    };

    const args = buildScrcpyArgs(config);
    expect(args).toContain('--new-display=1920x1080/320');
    expect(args).toContain('--flex-display');
    expect(args).toContain('--start-app=com.android.chrome');
  });

  it('should build recording arguments with MP4/MKV container and orientation', () => {
    const config: ScrcpyConfig = {
      serial: 'phone_01',
      recordPath: 'C:\\Videos\\session.mp4',
      recordFormat: 'mp4',
      recordOrientation: '90',
      noPlayback: true,
    };

    const args = buildScrcpyArgs(config);
    expect(args).toContain('--record=C:\\Videos\\session.mp4');
    expect(args).toContain('--record-format=mp4');
    expect(args).toContain('--record-orientation=90');
    expect(args).toContain('--no-playback');
  });

  it('should format full command string with proper quotes', () => {
    const args = ['--serial', 'device 001', '--window-title', 'My Studio Mirror'];
    const formatted = formatCommandString('scrcpy.exe', args);
    expect(formatted).toBe('scrcpy.exe --serial "device 001" --window-title "My Studio Mirror"');
  });

  it('should quote an executable path containing spaces without adding a trailing space', () => {
    expect(formatCommandString('C:\\Program Files\\scrcpy\\scrcpy.exe', [])).toBe(
      '"C:\\Program Files\\scrcpy\\scrcpy.exe"'
    );
  });
});
