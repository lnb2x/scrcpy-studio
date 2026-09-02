use crate::models::{AppError, AppResult, EnvironmentDiagnostics, RuntimeComponent, RuntimeStatus};
use crate::services::{AdbService, ScrcpyService};
use crate::utils::{parse_adb_version, parse_scrcpy_version, ExecutableDetection};
use chrono::Utc;
use std::path::Path;
use std::process::{Command, Output};

#[derive(Clone)]
pub struct RuntimeService {
    scrcpy: ScrcpyService,
    adb: AdbService,
}

impl RuntimeService {
    pub fn new(scrcpy: ScrcpyService, adb: AdbService) -> Self {
        Self { scrcpy, adb }
    }

    fn execute_probe(path: &Path, args: &[&str]) -> Result<Output, String> {
        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;

        let mut command = Command::new(path);
        command.args(args);
        #[cfg(target_os = "windows")]
        command.creation_flags(0x08000000);

        command.output().map_err(|error| error.to_string())
    }

    fn inspect_scrcpy(&self) -> RuntimeComponent {
        let Ok(path) = self.scrcpy.get_scrcpy_path() else {
            return RuntimeComponent {
                name: "scrcpy".to_string(),
                path: None,
                version: None,
                status: RuntimeStatus::Missing,
                message: "scrcpy.exe was not found in PATH or known install locations.".to_string(),
            };
        };

        match Self::execute_probe(&path, &["--version"]) {
            Ok(output) if output.status.success() => {
                let combined = format!(
                    "{}\n{}",
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr)
                );
                RuntimeComponent {
                    name: "scrcpy".to_string(),
                    path: Some(path.to_string_lossy().to_string()),
                    version: parse_scrcpy_version(&combined),
                    status: RuntimeStatus::Ready,
                    message: "scrcpy started successfully.".to_string(),
                }
            }
            Ok(output) => RuntimeComponent {
                name: "scrcpy".to_string(),
                path: Some(path.to_string_lossy().to_string()),
                version: None,
                status: RuntimeStatus::Error,
                message: probe_failure_message(&output),
            },
            Err(error) => RuntimeComponent {
                name: "scrcpy".to_string(),
                path: Some(path.to_string_lossy().to_string()),
                version: None,
                status: RuntimeStatus::Error,
                message: format!("Could not execute scrcpy: {error}"),
            },
        }
    }

    fn inspect_adb(&self) -> RuntimeComponent {
        let Ok(path) = self.adb.get_adb_path() else {
            return RuntimeComponent {
                name: "ADB".to_string(),
                path: None,
                version: None,
                status: RuntimeStatus::Missing,
                message: "adb.exe was not found in PATH or known install locations.".to_string(),
            };
        };

        match Self::execute_probe(&path, &["version"]) {
            Ok(output) if output.status.success() => {
                let combined = format!(
                    "{}\n{}",
                    String::from_utf8_lossy(&output.stdout),
                    String::from_utf8_lossy(&output.stderr)
                );
                RuntimeComponent {
                    name: "ADB".to_string(),
                    path: Some(path.to_string_lossy().to_string()),
                    version: parse_adb_version(&combined),
                    status: RuntimeStatus::Ready,
                    message: "ADB started successfully.".to_string(),
                }
            }
            Ok(output) => RuntimeComponent {
                name: "ADB".to_string(),
                path: Some(path.to_string_lossy().to_string()),
                version: None,
                status: RuntimeStatus::Error,
                message: probe_failure_message(&output),
            },
            Err(error) => RuntimeComponent {
                name: "ADB".to_string(),
                path: Some(path.to_string_lossy().to_string()),
                version: None,
                status: RuntimeStatus::Error,
                message: format!("Could not execute ADB: {error}"),
            },
        }
    }

    pub fn detect(&self) -> ExecutableDetection {
        let scrcpy = self.inspect_scrcpy();
        let adb = self.inspect_adb();
        let detected_locations = [scrcpy.path.as_ref(), adb.path.as_ref()]
            .into_iter()
            .flatten()
            .cloned()
            .collect();

        ExecutableDetection {
            scrcpy_path: scrcpy.path,
            scrcpy_version: scrcpy.version,
            adb_path: adb.path,
            adb_version: adb.version,
            is_scrcpy_ready: scrcpy.status == RuntimeStatus::Ready,
            is_adb_ready: adb.status == RuntimeStatus::Ready,
            detected_locations,
        }
    }

    pub fn check_environment(&self) -> EnvironmentDiagnostics {
        let scrcpy = self.inspect_scrcpy();
        let adb = self.inspect_adb();
        let devices = if adb.status == RuntimeStatus::Ready {
            self.adb.list_devices().unwrap_or_default()
        } else {
            Vec::new()
        };

        EnvironmentDiagnostics {
            scrcpy,
            adb,
            device_count: devices.len(),
            device_states: devices
                .into_iter()
                .map(|device| format!("{}:{:?}", device.serial, device.state).to_lowercase())
                .collect(),
            checked_at: Utc::now().timestamp_millis(),
        }
    }

    pub fn test(&self, component: &str) -> AppResult<RuntimeComponent> {
        let result = match component.to_ascii_lowercase().as_str() {
            "scrcpy" => self.inspect_scrcpy(),
            "adb" => self.inspect_adb(),
            other => {
                return Err(AppError::InvalidArgument(format!(
                    "Unknown runtime component: {other}"
                )))
            }
        };
        Ok(result)
    }

    pub fn repair(&self) -> AppResult<EnvironmentDiagnostics> {
        if self.adb.get_adb_path().is_ok() {
            // Restarting the server repairs the most common stale/offline ADB
            // state without downloading or executing untrusted content.
            let _ = self.adb.kill_server();
            self.adb.start_server()?;
        }
        Ok(self.check_environment())
    }
}

fn probe_failure_message(output: &Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let details = if stderr.trim().is_empty() {
        stdout.trim()
    } else {
        stderr.trim()
    };
    if details.is_empty() {
        format!(
            "Runtime probe exited with status {:?}",
            output.status.code()
        )
    } else {
        details.to_string()
    }
}
