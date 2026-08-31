use crate::models::{AppResult, ScrcpyConfig, ScrcpySession};
use crate::services::ScrcpyService;
use crate::utils::{CameraInfoItem, EncoderInfoItem};
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn start_scrcpy(
    app_handle: AppHandle,
    config: ScrcpyConfig,
    mode: Option<String>,
    scrcpy_service: State<'_, ScrcpyService>,
) -> AppResult<ScrcpySession> {
    scrcpy_service.start(app_handle, config, mode).await
}

#[tauri::command]
pub async fn stop_scrcpy(
    session_id: String,
    scrcpy_service: State<'_, ScrcpyService>,
) -> AppResult<bool> {
    scrcpy_service.stop(&session_id).await
}

#[tauri::command]
pub async fn get_active_sessions(
    scrcpy_service: State<'_, ScrcpyService>,
) -> AppResult<Vec<ScrcpySession>> {
    Ok(scrcpy_service.get_sessions().await)
}

#[tauri::command]
pub fn build_command_args(
    config: ScrcpyConfig,
    scrcpy_service: State<'_, ScrcpyService>,
) -> Vec<String> {
    scrcpy_service.build_args(&config)
}

#[tauri::command]
pub fn list_cameras(
    serial: Option<String>,
    scrcpy_service: State<'_, ScrcpyService>,
) -> AppResult<Vec<CameraInfoItem>> {
    scrcpy_service.list_cameras(serial.as_deref())
}

#[tauri::command]
pub fn list_encoders(
    serial: Option<String>,
    scrcpy_service: State<'_, ScrcpyService>,
) -> AppResult<Vec<EncoderInfoItem>> {
    scrcpy_service.list_encoders(serial.as_deref())
}
