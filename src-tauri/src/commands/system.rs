use crate::models::{AppError, AppResult};
use crate::services::{AdbService, ScrcpyService};
use crate::utils::{
    find_adb, find_scrcpy, parse_adb_version, parse_scrcpy_version, ExecutableDetection,
};
use std::path::PathBuf;
use std::process::Command;
use tauri::State;

#[tauri::command]
pub fn detect_executables(
    scrcpy_service: State<'_, ScrcpyService>,
    adb_service: State<'_, AdbService>,
) -> ExecutableDetection {
    let scrcpy_path_buf = scrcpy_service.get_scrcpy_path().ok().or_else(find_scrcpy);
    let adb_path_buf = adb_service.get_adb_path().ok().or_else(find_adb);

    let scrcpy_path = scrcpy_path_buf
        .as_ref()
        .map(|p| p.to_string_lossy().to_string());
    let adb_path = adb_path_buf
        .as_ref()
        .map(|p| p.to_string_lossy().to_string());

    let mut scrcpy_version = None;
    if let Some(ref p) = scrcpy_path {
        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;

        let mut cmd = Command::new(p);
        cmd.arg("--version");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000);

        if let Ok(output) = cmd.output() {
            let out_str = String::from_utf8_lossy(&output.stdout).to_string();
            scrcpy_version = parse_scrcpy_version(&out_str);
        }
    }

    let mut adb_version = None;
    if let Some(ref p) = adb_path {
        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;

        let mut cmd = Command::new(p);
        cmd.arg("version");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(0x08000000);

        if let Ok(output) = cmd.output() {
            let out_str = String::from_utf8_lossy(&output.stdout).to_string();
            adb_version = parse_adb_version(&out_str);
        }
    }

    let is_scrcpy_ready = scrcpy_path.is_some();
    let is_adb_ready = adb_path.is_some();

    let mut detected_locations = Vec::new();
    if let Some(ref p) = scrcpy_path {
        detected_locations.push(format!("scrcpy: {}", p));
    }
    if let Some(ref p) = adb_path {
        detected_locations.push(format!("adb: {}", p));
    }

    ExecutableDetection {
        scrcpy_path,
        scrcpy_version,
        adb_path,
        adb_version,
        is_scrcpy_ready,
        is_adb_ready,
        detected_locations,
    }
}

#[tauri::command]
pub fn set_custom_scrcpy_path(
    path: String,
    scrcpy_service: State<'_, ScrcpyService>,
) -> AppResult<bool> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        scrcpy_service.set_custom_path(None);
        return Ok(true);
    }

    let p = PathBuf::from(trimmed);
    if p.is_file() {
        scrcpy_service.set_custom_path(Some(p));
        Ok(true)
    } else {
        Err(AppError::ScrcpyNotFound(format!(
            "Path does not exist: {}",
            path
        )))
    }
}

#[tauri::command]
pub fn set_custom_adb_path(path: String, adb_service: State<'_, AdbService>) -> AppResult<bool> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        adb_service.set_custom_path(None);
        return Ok(true);
    }

    let p = PathBuf::from(trimmed);
    if p.is_file() {
        adb_service.set_custom_path(Some(p));
        Ok(true)
    } else {
        Err(AppError::AdbNotFound(format!(
            "Path does not exist: {}",
            path
        )))
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemDirectories {
    pub pictures_dir: String,
    pub videos_dir: String,
    pub downloads_dir: String,
    pub app_data_dir: String,
}

#[tauri::command]
pub fn get_default_directories() -> SystemDirectories {
    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string());
    let local_appdata = std::env::var("LOCALAPPDATA")
        .unwrap_or_else(|_| format!("{}\\AppData\\Local", user_profile));

    let pictures_dir = format!("{}\\Pictures\\Scrcpy Studio", user_profile);
    let videos_dir = format!("{}\\Videos\\Scrcpy Studio", user_profile);
    let downloads_dir = format!("{}\\Downloads", user_profile);
    let app_data_dir = format!("{}\\ScrcpyStudio", local_appdata);

    let _ = std::fs::create_dir_all(&pictures_dir);
    let _ = std::fs::create_dir_all(&videos_dir);

    SystemDirectories {
        pictures_dir,
        videos_dir,
        downloads_dir,
        app_data_dir,
    }
}

#[tauri::command]
pub fn app_close(window: tauri::WebviewWindow) {
    let _ = window.close();
}

#[tauri::command]
pub fn app_minimize(window: tauri::WebviewWindow) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn app_toggle_maximize(window: tauri::WebviewWindow) -> bool {
    match window.is_maximized() {
        Ok(true) => {
            let _ = window.unmaximize();
            false
        }
        Ok(false) => {
            let _ = window.maximize();
            true
        }
        Err(_) => false,
    }
}
