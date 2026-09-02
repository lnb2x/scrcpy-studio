export type DeviceState =
  | 'device'
  | 'offline'
  | 'unauthorized'
  | 'authorizing'
  | 'bootloader'
  | 'recovery'
  | 'sideload'
  | 'unknown';

export type ConnectionType = 'usb' | 'tcpip';

export interface AndroidDevice {
  serial: string;
  state: DeviceState;
  connectionType: ConnectionType;
  model?: string;
  manufacturer?: string;
  brand?: string;
  device?: string;
  androidVersion?: string;
  apiLevel?: number;
  screenResolution?: string;
  isSelected?: boolean;
}

export interface BatteryInfo {
  level?: number;
  isCharging?: boolean;
  temperature?: number;
  voltage?: number;
  health?: string;
  status?: string;
}

export interface DeviceInfo {
  serial: string;
  model: string;
  manufacturer: string;
  brand: string;
  codename: string;
  androidVersion: string;
  apiLevel: number;
  buildId: string;
  screenResolution: string;
  screenDensity: string;
  battery: BatteryInfo;
  connectionType: ConnectionType;
  supportsAudio: boolean;
  supportsCamera: boolean;
  supportsVirtualDisplay: boolean;
}

export interface MdnsService {
  name: string;
  serviceType: string;
  address: string;
  isPairing: boolean;
}
