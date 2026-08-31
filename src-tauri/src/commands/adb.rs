use crate::models::AppResult;
use crate::services::AdbService;
use tauri::State;

#[tauri::command]
pub fn adb_connect(address: String, adb_service: State<'_, AdbService>) -> AppResult<String> {
    adb_service.connect_wireless(&address)
}

#[tauri::command]
pub fn adb_disconnect(address: String, adb_service: State<'_, AdbService>) -> AppResult<String> {
    adb_service.disconnect_wireless(&address)
}

#[tauri::command]
pub fn adb_pair(
    address: String,
    code: String,
    adb_service: State<'_, AdbService>,
) -> AppResult<String> {
    adb_service.pair_wireless(&address, &code)
}

#[tauri::command]
pub fn adb_tcpip_enable(
    serial: String,
    port: Option<u16>,
    adb_service: State<'_, AdbService>,
) -> AppResult<String> {
    adb_service.enable_tcpip(&serial, port.unwrap_or(5555))
}

#[tauri::command]
pub fn adb_push_file(
    serial: String,
    local_path: String,
    remote_path: String,
    adb_service: State<'_, AdbService>,
) -> AppResult<String> {
    adb_service.push_file(&serial, &local_path, &remote_path)
}

#[tauri::command]
pub fn adb_pull_file(
    serial: String,
    remote_path: String,
    local_path: String,
    adb_service: State<'_, AdbService>,
) -> AppResult<String> {
    adb_service.pull_file(&serial, &remote_path, &local_path)
}

#[tauri::command]
pub fn adb_install_apk(
    serial: String,
    apk_path: String,
    reinstall: Option<bool>,
    downgrade: Option<bool>,
    grant_permissions: Option<bool>,
    adb_service: State<'_, AdbService>,
) -> AppResult<String> {
    adb_service.install_apk(
        &serial,
        &apk_path,
        reinstall.unwrap_or(true),
        downgrade.unwrap_or(false),
        grant_permissions.unwrap_or(true),
    )
}

#[tauri::command]
pub fn adb_take_screenshot(
    serial: String,
    target_path: String,
    adb_service: State<'_, AdbService>,
) -> AppResult<String> {
    adb_service.take_screenshot(&serial, &target_path)
}

#[tauri::command]
pub fn adb_reboot_device(
    serial: String,
    mode: Option<String>,
    adb_service: State<'_, AdbService>,
) -> AppResult<String> {
    adb_service.reboot_device(&serial, mode.as_deref())
}

#[tauri::command]
pub fn adb_list_packages(
    serial: String,
    filter: Option<String>,
    adb_service: State<'_, AdbService>,
) -> AppResult<Vec<String>> {
    adb_service.list_packages(&serial, filter.as_deref())
}

#[tauri::command]
pub fn adb_kill_server(adb_service: State<'_, AdbService>) -> AppResult<String> {
    adb_service.kill_server()
}

#[tauri::command]
pub fn adb_start_server(adb_service: State<'_, AdbService>) -> AppResult<String> {
    adb_service.start_server()
}
