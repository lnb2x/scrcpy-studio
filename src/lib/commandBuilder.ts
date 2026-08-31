import { ScrcpyConfig } from '../types/scrcpy';
import { ScrcpyProfile } from '../types/profile';

/**
 * Builds the exact array of command-line arguments for scrcpy 4.1.
 * Matches the Rust backend implementation to ensure 100% parity.
 */
export function buildScrcpyArgs(config: ScrcpyConfig): string[] {
  const args: string[] = [];
  const cameraEnabled = config.camera?.enabled === true;
  const cameraId = config.camera?.cameraId?.trim();
  const cameraSize = config.camera?.cameraSize?.trim();

  // 1. Device selection
  if (config.serial && config.serial.trim() !== '') {
    args.push('--serial', config.serial.trim());
  }

  // 2. OTG Mode
  if (config.otgMode) {
    args.push('--otg');
    if (config.keyboardMode) {
      args.push(`--keyboard=${config.keyboardMode}`);
    }
    if (config.mouseMode) {
      args.push(`--mouse=${config.mouseMode}`);
    }
    if (config.gamepadMode) {
      args.push(`--gamepad=${config.gamepadMode}`);
    }
    return args;
  }

  // 3. Camera Mode
  if (config.camera && cameraEnabled) {
    args.push('--video-source=camera');

    if (cameraId) {
      args.push(`--camera-id=${cameraId}`);
    }
    if (!cameraId && config.camera.cameraFacing && config.camera.cameraFacing.trim() !== '') {
      args.push(`--camera-facing=${config.camera.cameraFacing.trim()}`);
    }
    if (cameraSize) {
      args.push(`--camera-size=${cameraSize}`);
    }
    if (config.camera.cameraFps && config.camera.cameraFps > 0) {
      args.push(`--camera-fps=${config.camera.cameraFps}`);
    }
    if (config.camera.cameraHighSpeed) {
      args.push('--camera-high-speed');
    }
    if (config.camera.cameraTorch) {
      args.push('--camera-torch');
    }
    if (config.camera.cameraZoom && config.camera.cameraZoom > 0) {
      args.push(`--camera-zoom=${config.camera.cameraZoom}`);
    }
    if (!cameraSize && config.camera.cameraAr && config.camera.cameraAr.trim() !== '') {
      args.push(`--camera-ar=${config.camera.cameraAr.trim()}`);
    }
  }

  // 4. Virtual Display
  if (config.virtualDisplay && config.virtualDisplay.enabled) {
    const vd = config.virtualDisplay;
    if (vd.resolution && vd.resolution.trim() !== '') {
      if (vd.dpi && vd.dpi > 0) {
        args.push(`--new-display=${vd.resolution.trim()}/${vd.dpi}`);
      } else {
        args.push(`--new-display=${vd.resolution.trim()}`);
      }
    } else if (vd.dpi && vd.dpi > 0) {
      args.push(`--new-display=/${vd.dpi}`);
    } else {
      args.push('--new-display');
    }

    if (vd.flexDisplay) {
      args.push('--flex-display');
    }
    if (vd.destroyContent === false) {
      args.push('--no-vd-destroy-content');
    }
    if (vd.systemDecorations === false) {
      args.push('--no-vd-system-decorations');
    }
    if (vd.startApp && vd.startApp.trim() !== '') {
      args.push(`--start-app=${vd.startApp.trim()}`);
    }
  }

  // 5. Video Options
  if (config.videoEnabled !== false) {
    if (config.videoCodec && config.videoCodec !== 'h264') {
      args.push(`--video-codec=${config.videoCodec}`);
    }
    if (!cameraSize && config.maxSize && config.maxSize > 0) {
      args.push(`--max-size=${config.maxSize}`);
    }
    if (config.maxFps && config.maxFps > 0) {
      args.push(`--max-fps=${config.maxFps}`);
    }
    if (config.videoBitrate && config.videoBitrate.trim() !== '') {
      args.push(`--video-bit-rate=${config.videoBitrate.trim()}`);
    }
    if (config.videoEncoder && config.videoEncoder.trim() !== '') {
      args.push(`--video-encoder=${config.videoEncoder.trim()}`);
    }
    if (config.videoBuffer && config.videoBuffer > 0) {
      args.push(`--video-buffer=${config.videoBuffer}`);
    }
    if (config.ignoreVideoEncoderConstraints) {
      args.push('--ignore-video-encoder-constraints');
    }
    if (config.minSizeAlignment && config.minSizeAlignment > 1) {
      args.push(`--min-size-alignment=${config.minSizeAlignment}`);
    }
    if (config.crop && config.crop.trim() !== '') {
      args.push(`--crop=${config.crop.trim()}`);
    }
    if (config.displayOrientation && config.displayOrientation !== '0' && config.displayOrientation !== 'auto') {
      args.push(`--display-orientation=${config.displayOrientation}`);
    }
    if (config.captureOrientation && config.captureOrientation !== '0') {
      args.push(`--capture-orientation=${config.captureOrientation}`);
    }
    if (config.angle && config.angle > 0) {
      args.push(`--angle=${config.angle}`);
    }
  } else {
    args.push('--no-video');
  }

  // 6. Audio Options
  if (config.audioEnabled !== false) {
    if (config.audioSource && (config.audioSource !== 'output' || cameraEnabled)) {
      args.push(`--audio-source=${config.audioSource}`);
    }
    if (config.audioCodec && config.audioCodec !== 'opus') {
      args.push(`--audio-codec=${config.audioCodec}`);
    }
    if (config.audioBitrate && config.audioBitrate.trim() !== '') {
      args.push(`--audio-bit-rate=${config.audioBitrate.trim()}`);
    }
    if (config.audioBuffer && config.audioBuffer > 0 && config.audioBuffer !== 50) {
      args.push(`--audio-buffer=${config.audioBuffer}`);
    }
    if (config.audioDup) {
      args.push('--audio-dup');
    }
    if (config.audioEncoder && config.audioEncoder.trim() !== '') {
      args.push(`--audio-encoder=${config.audioEncoder.trim()}`);
    }
    if (config.requireAudio) {
      args.push('--require-audio');
    }
  } else {
    args.push('--no-audio');
  }

  // 7. Input & Control
  if (config.controlEnabled === false) {
    args.push('--no-control');
  } else {
    if (config.keyboardMode && config.keyboardMode !== 'sdk') {
      args.push(`--keyboard=${config.keyboardMode}`);
    }
    if (config.mouseMode && config.mouseMode !== 'sdk') {
      args.push(`--mouse=${config.mouseMode}`);
    }
    if (config.gamepadMode && config.gamepadMode !== 'disabled') {
      args.push(`--gamepad=${config.gamepadMode}`);
    }
    if (config.legacyPaste) {
      args.push('--legacy-paste');
    }
    if (config.clipboardAutosync === false) {
      args.push('--no-clipboard-autosync');
    }
    if (config.showTouches) {
      args.push('--show-touches');
    }
    if (config.stayAwake) {
      args.push('--stay-awake');
    }
    if (config.turnScreenOff) {
      args.push('--turn-screen-off');
    }
    if (config.powerOffOnClose) {
      args.push('--power-off-on-close');
    }
    if (config.noPowerOn) {
      args.push('--no-power-on');
    }
    if (config.noKeyRepeat) {
      args.push('--no-key-repeat');
    }
    if (config.preferText) {
      args.push('--prefer-text');
    }
    if (config.rawKeyEvents) {
      args.push('--raw-key-events');
    }
  }

  // 8. Window Options
  if (config.fullscreen) {
    args.push('--fullscreen');
  }
  if (config.alwaysOnTop) {
    args.push('--always-on-top');
  }
  if (config.windowBorderless) {
    args.push('--window-borderless');
  }
  if (config.windowTitle && config.windowTitle.trim() !== '') {
    args.push(`--window-title=${config.windowTitle.trim()}`);
  }
  if (config.windowWidth && config.windowWidth > 0) {
    args.push(`--window-width=${config.windowWidth}`);
  }
  if (config.windowHeight && config.windowHeight > 0) {
    args.push(`--window-height=${config.windowHeight}`);
  }
  if (config.windowX && config.windowX !== 'auto' && config.windowX.trim() !== '') {
    args.push(`--window-x=${config.windowX.trim()}`);
  }
  if (config.windowY && config.windowY !== 'auto' && config.windowY.trim() !== '') {
    args.push(`--window-y=${config.windowY.trim()}`);
  }
  if (config.renderDriver && config.renderDriver !== 'auto') {
    args.push(`--render-driver=${config.renderDriver}`);
  }
  if (config.renderFit && config.renderFit !== 'letterbox') {
    args.push(`--render-fit=${config.renderFit}`);
  }
  if (config.disableScreensaver) {
    args.push('--disable-screensaver');
  }
  if (config.printFps) {
    args.push('--print-fps');
  }

  // 9. Recording
  if (config.recordPath && config.recordPath.trim() !== '') {
    args.push(`--record=${config.recordPath.trim()}`);
    if (config.recordFormat && config.recordFormat.trim() !== '') {
      args.push(`--record-format=${config.recordFormat.trim()}`);
    }
    if (config.recordOrientation && config.recordOrientation.trim() !== '') {
      args.push(`--record-orientation=${config.recordOrientation.trim()}`);
    }
    if (config.noPlayback) {
      args.push('--no-playback');
    }
  }

  // 10. Display ID & Time limit
  if (config.displayId && config.displayId > 0) {
    args.push(`--display-id=${config.displayId}`);
  }
  if (config.timeLimit && config.timeLimit > 0) {
    args.push(`--time-limit=${config.timeLimit}`);
  }
  if (config.forceAdbForward) {
    args.push('--force-adb-forward');
  }
  if (config.killAdbOnClose) {
    args.push('--kill-adb-on-close');
  }

  // 11. Custom raw args
  if (config.customArgs && Array.isArray(config.customArgs)) {
    for (const raw of config.customArgs) {
      const trimmed = raw.trim();
      if (trimmed && !args.includes(trimmed)) {
        args.push(trimmed);
      }
    }
  }

  return args;
}

export function formatCommandString(executable: string, args: string[]): string {
  const exe = executable || 'scrcpy';
  return [exe, ...args].map(quoteWindowsCommandArgument).join(' ');
}

function quoteWindowsCommandArgument(argument: string): string {
  if (argument.length > 0 && !/[\s"]/u.test(argument)) return argument;

  let quoted = '"';
  let backslashes = 0;

  for (const character of argument) {
    if (character === '\\') {
      backslashes += 1;
    } else if (character === '"') {
      quoted += '\\'.repeat(backslashes * 2 + 1) + '"';
      backslashes = 0;
    } else {
      quoted += '\\'.repeat(backslashes) + character;
      backslashes = 0;
    }
  }

  return quoted + '\\'.repeat(backslashes * 2) + '"';
}

export const SMART_PRESETS: ScrcpyProfile[] = [
  {
    id: 'preset-ultra',
    name: 'Ultra Quality',
    description: '2560 max size, 120 FPS, H.265 / HEVC, 24 Mbps high quality stream',
    isBuiltIn: true,
    iconName: 'Sparkles',
    createdAt: Date.now(),
    config: {
      maxSize: 2560,
      maxFps: 120,
      videoCodec: 'h265',
      videoBitrate: '24M',
      audioEnabled: true,
      controlEnabled: true,
      stayAwake: true,
    },
  },
  {
    id: 'preset-quality',
    name: 'High Quality',
    description: '1920p FHD, 60 FPS, H.265 / HEVC, 16 Mbps bitrate',
    isBuiltIn: true,
    isFavorite: true,
    iconName: 'Film',
    createdAt: Date.now(),
    config: {
      maxSize: 1920,
      maxFps: 60,
      videoCodec: 'h265',
      videoBitrate: '16M',
      audioEnabled: true,
      controlEnabled: true,
      stayAwake: true,
    },
  },
  {
    id: 'preset-gaming',
    name: 'Gaming / Low Latency',
    description: '1600p, 120 FPS, H.264, 16 Mbps, minimal buffering for fast response',
    isBuiltIn: true,
    isFavorite: true,
    iconName: 'Gamepad2',
    createdAt: Date.now(),
    config: {
      maxSize: 1600,
      maxFps: 120,
      videoCodec: 'h264',
      videoBitrate: '16M',
      videoBuffer: 0,
      audioEnabled: true,
      audioBuffer: 20,
      controlEnabled: true,
      stayAwake: true,
    },
  },
  {
    id: 'preset-balanced',
    name: 'Balanced (Default)',
    description: '1600p, 60 FPS, H.264, 8 Mbps — ideal for most devices',
    isBuiltIn: true,
    isFavorite: true,
    iconName: 'Sliders',
    createdAt: Date.now(),
    config: {
      maxSize: 1600,
      maxFps: 60,
      videoCodec: 'h264',
      videoBitrate: '8M',
      audioEnabled: true,
      controlEnabled: true,
      stayAwake: true,
    },
  },
  {
    id: 'preset-wireless',
    name: 'Wireless Balanced',
    description: '1280p, 60 FPS, H.264, 4 Mbps — optimized for Wi-Fi stability',
    isBuiltIn: true,
    iconName: 'Wifi',
    createdAt: Date.now(),
    config: {
      maxSize: 1280,
      maxFps: 60,
      videoCodec: 'h264',
      videoBitrate: '4M',
      videoBuffer: 50,
      audioEnabled: true,
      controlEnabled: true,
    },
  },
  {
    id: 'preset-battery',
    name: 'Battery Saver',
    description: '1024p, 30 FPS, H.264, 2 Mbps, physical screen turned off',
    isBuiltIn: true,
    iconName: 'BatteryCharging',
    createdAt: Date.now(),
    config: {
      maxSize: 1024,
      maxFps: 30,
      videoCodec: 'h264',
      videoBitrate: '2M',
      turnScreenOff: true,
      audioEnabled: true,
      controlEnabled: true,
    },
  },
  {
    id: 'preset-presentation',
    name: 'Presentation Mode',
    description: '1920p, show touches, stay awake, always on top',
    isBuiltIn: true,
    iconName: 'Tv',
    createdAt: Date.now(),
    config: {
      maxSize: 1920,
      maxFps: 60,
      videoCodec: 'h264',
      videoBitrate: '12M',
      showTouches: true,
      stayAwake: true,
      alwaysOnTop: true,
      audioEnabled: true,
      controlEnabled: true,
    },
  },
  {
    id: 'preset-low-end',
    name: 'Low-End Device',
    description: '800p, 30 FPS, H.264, 2 Mbps — maximum compatibility',
    isBuiltIn: true,
    iconName: 'Cpu',
    createdAt: Date.now(),
    config: {
      maxSize: 800,
      maxFps: 30,
      videoCodec: 'h264',
      videoBitrate: '2M',
      audioEnabled: false,
      controlEnabled: true,
    },
  },
];
