import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { AndroidDevice, BatteryInfo, DeviceInfo } from '../types/device';

interface DeviceStore {
  devices: AndroidDevice[];
  selectedSerial: string | null;
  selectedDevice: AndroidDevice | null;
  deviceInfo: DeviceInfo | null;
  batteryInfo: BatteryInfo | null;
  isLoading: boolean;
  error: string | null;

  fetchDevices: () => Promise<void>;
  selectDevice: (serial: string) => Promise<void>;
  fetchDeviceInfo: (serial: string) => Promise<void>;
  fetchBatteryInfo: (serial: string) => Promise<void>;
  clearSelection: () => void;
}

let deviceListRequest: Promise<void> | null = null;

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: [],
  selectedSerial: null,
  selectedDevice: null,
  deviceInfo: null,
  batteryInfo: null,
  isLoading: false,
  error: null,

  fetchDevices: () => {
    if (deviceListRequest) return deviceListRequest;

    const request = (async () => {
      set({ isLoading: true, error: null });
      try {
        const list = await invoke<AndroidDevice[]>('list_devices');
        const currentSelected = get().selectedSerial;

        let newSelected = currentSelected;
        if (list.length > 0) {
          if (!currentSelected || !list.some((device) => device.serial === currentSelected)) {
            newSelected = list[0].serial;
          }
        } else {
          newSelected = null;
        }

        const activeDev = list.find((device) => device.serial === newSelected) || null;
        const selectionChanged = newSelected !== currentSelected;
        const canInspect = newSelected !== null && activeDev?.state === 'device';

        set({
          devices: list,
          selectedSerial: newSelected,
          selectedDevice: activeDev,
          deviceInfo: selectionChanged || !canInspect ? null : get().deviceInfo,
          batteryInfo: selectionChanged || !canInspect ? null : get().batteryInfo,
          isLoading: false,
        });

        if (newSelected && canInspect) {
          if (selectionChanged || !get().deviceInfo) {
            void get().fetchDeviceInfo(newSelected);
          } else {
            void get().fetchBatteryInfo(newSelected);
          }
        }
      } catch (err: unknown) {
        set({
          isLoading: false,
          error:
            typeof err === 'object' && err !== null && 'message' in err
              ? (err as { message: string }).message
              : String(err),
        });
      }
    })();

    deviceListRequest = request;
    void request.finally(() => {
      if (deviceListRequest === request) deviceListRequest = null;
    });
    return request;
  },

  selectDevice: async (serial: string) => {
    const dev = get().devices.find((d) => d.serial === serial) || null;
    set({
      selectedSerial: serial,
      selectedDevice: dev,
      deviceInfo: null,
      batteryInfo: null,
    });

    if (dev && dev.state === 'device') {
      await get().fetchDeviceInfo(serial);
    }
  },

  fetchDeviceInfo: async (serial: string) => {
    try {
      const info = await invoke<DeviceInfo>('get_device_info', { serial });
      if (get().selectedSerial === serial) {
        set({ deviceInfo: info, batteryInfo: info.battery });
      }
    } catch (e) {
      console.warn('Failed to fetch detailed device info:', e);
    }
  },

  fetchBatteryInfo: async (serial: string) => {
    try {
      const batt = await invoke<BatteryInfo>('get_battery_info', { serial });
      if (get().selectedSerial === serial) {
        set({ batteryInfo: batt });
      }
    } catch (e) {
      console.warn('Failed to fetch battery info:', e);
    }
  },

  clearSelection: () => {
    set({
      selectedSerial: null,
      selectedDevice: null,
      deviceInfo: null,
      batteryInfo: null,
    });
  },
}));
