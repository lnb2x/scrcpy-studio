import type { ScrcpyConfig } from '@/types/scrcpy';

export interface ConfigValidationIssue {
  field: keyof ScrcpyConfig | 'customArgs';
  message: string;
}

const CUSTOM_ARGUMENT_PATTERN = /^--[a-z0-9][a-z0-9-]*(?:=.*)?$/u;
const BIT_RATE_PATTERN = /^\d+(?:[KM])?$/iu;
const SIZE_PATTERN = /^\d+x\d+$/u;
const CAMERA_ASPECT_RATIO_PATTERN = /^(?:sensor|\d+(?::\d+)?(?:\.\d+)?)$/u;
const MOUSE_BIND_PATTERN = /^[+\-bhsn]{4}(?::[+\-bhsn]{4})?$/u;
const SHORTCUT_MOD_PATTERN = /^(?:lctrl|rctrl|lalt|ralt|lsuper|rsuper)(?:\+(?:lctrl|rctrl|lalt|ralt|lsuper|rsuper))*(?:,(?:lctrl|rctrl|lalt|ralt|lsuper|rsuper)(?:\+(?:lctrl|rctrl|lalt|ralt|lsuper|rsuper))*)*$/u;

/** Returns the canonical long-option key used for duplicate/conflict detection. */
export function getScrcpyOptionKey(argument: string): string {
  const trimmed = argument.trim();
  const separator = trimmed.indexOf('=');
  return (separator === -1 ? trimmed : trimmed.slice(0, separator)).toLowerCase();
}

/**
 * Custom arguments are one argv item each. Values containing spaces are valid
 * only in the `--option=value` form because no shell tokenization is performed.
 */
export function validateCustomArgument(argument: string): string | null {
  const trimmed = argument.trim();
  if (!trimmed) return 'Argument cannot be empty.';
  if (trimmed.includes('\0') || /[\r\n]/u.test(trimmed)) {
    return 'Arguments cannot contain null bytes or line breaks.';
  }
  if (!CUSTOM_ARGUMENT_PATTERN.test(trimmed)) {
    return 'Use one long argv item, for example --no-mipmaps or --background-color=#000000.';
  }
  return null;
}

/**
 * Appends valid custom argv items without allowing them to replace typed
 * settings or add the same option more than once. The first custom value wins.
 */
export function appendCustomArguments(
  structuredArgs: string[],
  customArgs: readonly string[] | undefined,
  blockedKeys: ReadonlySet<string> = new Set()
): string[] {
  if (!customArgs?.length) return structuredArgs;

  const result = [...structuredArgs];
  const seenKeys = new Set(
    structuredArgs.filter((arg) => arg.startsWith('--')).map(getScrcpyOptionKey)
  );

  for (const raw of customArgs) {
    const argument = raw.trim();
    if (validateCustomArgument(argument)) continue;
    const key = getScrcpyOptionKey(argument);
    if (seenKeys.has(key) || blockedKeys.has(key)) continue;
    seenKeys.add(key);
    result.push(argument);
  }

  return result;
}

export function validateScrcpyConfig(config: ScrcpyConfig): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];
  const add = (field: ConfigValidationIssue['field'], message: string) => {
    issues.push({ field, message });
  };

  const positiveIntegers: Array<[keyof ScrcpyConfig, number | undefined]> = [
    ['maxSize', config.maxSize],
    ['maxFps', config.maxFps],
    ['windowWidth', config.windowWidth],
    ['windowHeight', config.windowHeight],
    ['timeLimit', config.timeLimit],
  ];
  for (const [field, value] of positiveIntegers) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      add(field, `${String(field)} must be a non-negative integer.`);
    }
  }

  const nonNegativeIntegers: Array<[keyof ScrcpyConfig, number | undefined]> = [
    ['videoBuffer', config.videoBuffer],
    ['audioBuffer', config.audioBuffer],
    ['audioOutputBuffer', config.audioOutputBuffer],
    ['screenOffTimeout', config.screenOffTimeout],
  ];
  for (const [field, value] of nonNegativeIntegers) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      add(field, `${String(field)} must be a non-negative integer.`);
    }
  }

  if (
    config.tunnelPort !== undefined &&
    (!Number.isInteger(config.tunnelPort) || config.tunnelPort < 1 || config.tunnelPort > 65535)
  ) {
    add('tunnelPort', 'Tunnel port must be between 1 and 65535.');
  }

  for (const [field, value] of [
    ['videoBitrate', config.videoBitrate],
    ['audioBitrate', config.audioBitrate],
  ] as const) {
    if (value?.trim() && !BIT_RATE_PATTERN.test(value.trim())) {
      add(field, 'Bit rate must be an integer with an optional K or M suffix.');
    }
  }

  if (config.backgroundColor?.trim() && !/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/iu.test(config.backgroundColor.trim())) {
    add('backgroundColor', 'Background color must use #RGB or #RRGGBB.');
  }
  if (config.mouseBind?.trim() && !MOUSE_BIND_PATTERN.test(config.mouseBind.trim())) {
    add('mouseBind', 'Mouse binding must contain 4 bindings, optionally followed by a second group.');
  }
  if (config.shortcutMod?.trim() && !SHORTCUT_MOD_PATTERN.test(config.shortcutMod.trim())) {
    add('shortcutMod', 'Shortcut modifiers contain an unsupported key or separator.');
  }
  if (config.camera?.cameraSize?.trim() && !SIZE_PATTERN.test(config.camera.cameraSize.trim())) {
    add('camera', 'Camera size must use WIDTHxHEIGHT.');
  }
  if (config.camera?.cameraAr?.trim() && !CAMERA_ASPECT_RATIO_PATTERN.test(config.camera.cameraAr.trim())) {
    add('camera', 'Camera aspect ratio must be sensor, a ratio such as 16:9, or a number.');
  }
  if (config.virtualDisplay?.resolution?.trim() && !SIZE_PATTERN.test(config.virtualDisplay.resolution.trim())) {
    add('virtualDisplay', 'Virtual display resolution must use WIDTHxHEIGHT.');
  }

  const customKeys = new Set<string>();
  for (const raw of config.customArgs ?? []) {
    const error = validateCustomArgument(raw);
    if (error) {
      add('customArgs', error);
      continue;
    }
    const key = getScrcpyOptionKey(raw);
    if (customKeys.has(key)) add('customArgs', `Duplicate custom option: ${key}.`);
    customKeys.add(key);
  }

  if (config.otgMode && (config.recordPath || config.camera?.enabled || config.virtualDisplay?.enabled)) {
    add('otgMode', 'OTG cannot be combined with recording, camera, or virtual-display mode.');
  }

  return issues;
}
