import { ScrcpyConfig } from './scrcpy';

export interface ScrcpyProfile {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  isFavorite?: boolean;
  iconName: string;
  config: ScrcpyConfig;
  createdAt: number;
  deviceSerial?: string;
  deviceModel?: string;
  autoLaunch?: boolean;
}
