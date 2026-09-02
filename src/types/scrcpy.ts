export type VideoCodec = 'h264' | 'h265' | 'av1' | 'vp8' | 'vp9';
export type AudioCodec = 'opus' | 'aac' | 'flac' | 'raw';
export type AudioSource =
  | 'output'
  | 'playback'
  | 'mic'
  | 'mic-unprocessed'
  | 'mic-camcorder'
  | 'mic-voice-recognition'
  | 'mic-voice-communication'
  | 'voice-call'
  | 'voice-call-uplink'
  | 'voice-call-downlink'
  | 'voice-performance';
export type InputMode = 'sdk' | 'uhid' | 'aoa' | 'disabled';
export type GamepadMode = 'disabled' | 'uhid' | 'aoa';
export type RenderFit = 'letterbox' | 'stretched' | 'unscaled';
export type RenderDriver = 'auto' | 'direct3d' | 'opengl' | 'opengles2' | 'opengles' | 'metal' | 'software';
export type RecordFormat = 'mp4' | 'mkv' | 'm4a' | 'mka' | 'opus' | 'aac' | 'flac' | 'wav';
export type DisplayImePolicy = 'local' | 'fallback' | 'hide';

export interface CameraConfig {
  enabled: boolean;
  cameraId?: string;
  cameraFacing?: 'front' | 'back' | 'external';
  cameraSize?: string;
  cameraFps?: number;
  cameraHighSpeed?: boolean;
  cameraTorch?: boolean;
  cameraZoom?: number;
  cameraAr?: string;
}

export interface VirtualDisplayConfig {
  enabled: boolean;
  resolution?: string;
  dpi?: number;
  flexDisplay?: boolean;
  destroyContent?: boolean;
  systemDecorations?: boolean;
  startApp?: string;
}

export interface ScrcpyConfig {
  serial?: string;

  // Video
  videoEnabled?: boolean;
  videoCodec?: VideoCodec;
  maxSize?: number;
  maxFps?: number;
  videoBitrate?: string;
  videoEncoder?: string;
  videoCodecOptions?: string;
  videoBuffer?: number;
  ignoreVideoEncoderConstraints?: boolean;
  noDownsizeOnError?: boolean;
  minSizeAlignment?: number;
  crop?: string;
  displayOrientation?: string;
  captureOrientation?: string;
  angle?: number;

  // Audio
  audioEnabled?: boolean;
  audioSource?: AudioSource;
  audioCodec?: AudioCodec;
  audioBitrate?: string;
  audioBuffer?: number;
  audioOutputBuffer?: number;
  audioDup?: boolean;
  audioEncoder?: string;
  audioCodecOptions?: string;
  requireAudio?: boolean;

  // Input & Control
  controlEnabled?: boolean;
  keyboardMode?: InputMode;
  mouseMode?: InputMode;
  gamepadMode?: GamepadMode;
  legacyPaste?: boolean;
  clipboardAutosync?: boolean;
  showTouches?: boolean;
  stayAwake?: boolean;
  turnScreenOff?: boolean;
  powerOffOnClose?: boolean;
  noPowerOn?: boolean;
  noKeyRepeat?: boolean;
  preferText?: boolean;
  rawKeyEvents?: boolean;
  screenOffTimeout?: number;
  displayImePolicy?: DisplayImePolicy;
  keepActive?: boolean;
  mouseBind?: string;
  noMouseHover?: boolean;
  shortcutMod?: string;

  // Window
  fullscreen?: boolean;
  alwaysOnTop?: boolean;
  windowBorderless?: boolean;
  windowTitle?: string;
  windowWidth?: number;
  windowHeight?: number;
  windowX?: string;
  windowY?: string;
  renderDriver?: RenderDriver;
  renderFit?: RenderFit;
  backgroundColor?: string;
  noWindow?: boolean;
  noWindowAspectRatioLock?: boolean;
  noMipmaps?: boolean;
  disableScreensaver?: boolean;
  printFps?: boolean;

  // Recording
  recordPath?: string;
  recordFormat?: RecordFormat;
  recordOrientation?: string;
  noPlayback?: boolean;
  noVideoPlayback?: boolean;
  noAudioPlayback?: boolean;

  // Modes & Special
  otgMode?: boolean;
  displayId?: number;
  timeLimit?: number;
  tunnelHost?: string;
  tunnelPort?: number;
  forceAdbForward?: boolean;
  killAdbOnClose?: boolean;
  noCleanup?: boolean;

  // Sub-configs
  camera?: CameraConfig;
  virtualDisplay?: VirtualDisplayConfig;

  // Additional raw args
  customArgs?: string[];
}

export type SessionStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';

export interface ScrcpySession {
  id: string;
  deviceSerial: string;
  processId?: number;
  status: SessionStatus;
  startedAt: number;
  stoppedAt?: number;
  command: string[];
  mode: string;
  exitCode?: number;
  errorMessage?: string;
}

export interface CameraInfoItem {
  id: string;
  facing: string;
  sizes: string[];
  fps: number[];
}

export interface EncoderInfoItem {
  codec: string;
  encoderName: string;
  isHardware: boolean;
  mediaType: 'video' | 'audio';
}
