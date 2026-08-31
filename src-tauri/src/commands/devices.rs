use crate::models::{AndroidDevice, AppResult, BatteryInfo, DeviceInfo};
use crate::services::AdbService;
use tauri::State;

#[tauri::command]
pub fn list_devices(adb_service: State<'_, AdbService>) -> AppResult<Vec<AndroidDevice>> {
    adb_service.list_devices()
}

#[tauri::command]
pub fn get_device_info(
    serial: String,
    adb_service: State<'_, AdbService>,
) -> AppResult<DeviceInfo> {
    adb_service.get_full_device_info(&serial)
}

#[tauri::command]
pub fn get_battery_info(
    serial: String,
    adb_service: State<'_, AdbService>,
) -> AppResult<BatteryInfo> {
    adb_service.get_battery_info(&serial)
}
