use crate::models::{AppError, AppResult, EnvironmentDiagnostics, RuntimeComponent};
use crate::services::{AdbService, RuntimeService, ScrcpyService};
use crate::utils::ExecutableDetection;
use std::path::PathBuf;
use std::process::Command;
use tauri::State;

#[tauri::command]
pub fn detect_executables(runtime_service: State<'_, RuntimeService>) -> ExecutableDetection {
    runtime_service.detect()
}

#[tauri::command]
pub fn check_runtime(runtime_service: State<'_, RuntimeService>) -> EnvironmentDiagnostics {
    runtime_service.check_environment()
}

#[tauri::command]
pub fn test_runtime(
    component: String,
    runtime_service: State<'_, RuntimeService>,
) -> AppResult<RuntimeComponent> {
    runtime_service.test(&component)
}

#[tauri::command]
pub fn repair_runtime(
    runtime_service: State<'_, RuntimeService>,
) -> AppResult<EnvironmentDiagnostics> {
    runtime_service.repair()
}

#[tauri::command]
pub fn updater_configured() -> bool {
    option_env!("TAURI_UPDATER_PUBLIC_KEY").is_some_and(|key| !key.trim().is_empty())
}

#[tauri::command]
pub fn prepare_recording_path(path: String) -> AppResult<String> {
    collision_safe_recording_path(PathBuf::from(path))
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_directory(path: String) -> AppResult<()> {
    let directory = validated_directory(&path)?;

    #[cfg(target_os = "windows")]
    Command::new("explorer.exe")
        .arg(directory)
        .spawn()
        .map(|_| ())
        .map_err(|error| AppError::Io(format!("Could not open directory: {error}")))?;

    #[cfg(not(target_os = "windows"))]
    return Err(AppError::InvalidArgument(
        "Opening directories is only supported by the Windows build".to_string(),
    ));

    Ok(())
}

fn validated_directory(path: &str) -> AppResult<PathBuf> {
    let directory = PathBuf::from(path.trim());
    if !directory.is_absolute() || !directory.is_dir() {
        return Err(AppError::InvalidArgument(format!(
            "Directory does not exist or is not absolute: {path}"
        )));
    }
    directory.canonicalize().map_err(|error| {
        AppError::Io(format!(
            "Could not resolve directory {}: {error}",
            directory.display()
        ))
    })
}

fn collision_safe_recording_path(path: PathBuf) -> AppResult<PathBuf> {
    const ALLOWED_EXTENSIONS: &[&str] = &["mp4", "mkv", "m4a", "mka", "opus", "aac", "flac", "wav"];
    if !path.is_absolute() {
        return Err(AppError::InvalidArgument(
            "Recording path must be absolute".to_string(),
        ));
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| {
            AppError::InvalidArgument("Recording path needs a file extension".to_string())
        })?;
    if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(AppError::InvalidArgument(format!(
            "Unsupported recording extension: {extension}"
        )));
    }
    let parent = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .ok_or_else(|| {
            AppError::InvalidArgument("Recording path needs an output directory".to_string())
        })?;
    if !parent.is_dir() {
        return Err(AppError::InvalidArgument(format!(
            "Recording directory does not exist: {}",
            parent.display()
        )));
    }
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| AppError::InvalidArgument("Recording filename is empty".to_string()))?;

    if !path.exists() {
        return Ok(path);
    }
    for suffix in 1..=9999 {
        let candidate = parent.join(format!("{stem}-{suffix}.{extension}"));
        if !candidate.exists() {
            return Ok(candidate);
        }
    }
    Err(AppError::Io(
        "Could not find a collision-free recording filename".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::{collision_safe_recording_path, validated_directory};

    #[test]
    fn recording_paths_validate_extensions_and_avoid_overwrites() {
        let directory =
            std::env::temp_dir().join(format!("scrcpy-studio-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&directory).expect("create test directory");
        let original = directory.join("capture.mp4");
        std::fs::write(&original, b"existing").expect("create existing recording");

        let resolved = collision_safe_recording_path(original).expect("resolve collision");
        assert_eq!(
            resolved.file_name().and_then(|name| name.to_str()),
            Some("capture-1.mp4")
        );
        assert!(collision_safe_recording_path(directory.join("capture.exe")).is_err());
        assert!(collision_safe_recording_path(std::path::PathBuf::from("capture.mp4")).is_err());
        assert!(validated_directory(directory.to_string_lossy().as_ref()).is_ok());

        std::fs::remove_dir_all(&directory).expect("remove test directory");
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
