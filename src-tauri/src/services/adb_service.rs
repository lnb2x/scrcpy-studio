use crate::models::{AndroidDevice, AppError, AppResult, BatteryInfo, ConnectionType, DeviceInfo};
use crate::utils::{find_adb, parse_adb_devices, parse_dumpsys_battery, parse_getprop_output};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;

#[derive(Clone)]
pub struct AdbService {
    custom_adb_path: std::sync::Arc<Mutex<Option<PathBuf>>>,
}

impl Default for AdbService {
    fn default() -> Self {
        Self::new()
    }
}

impl AdbService {
    pub fn new() -> Self {
        Self {
            custom_adb_path: std::sync::Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_custom_path(&self, path: Option<PathBuf>) {
        let mut p = self.custom_adb_path.lock().unwrap();
        *p = path;
    }

    pub fn get_adb_path(&self) -> AppResult<PathBuf> {
        let custom = self.custom_adb_path.lock().unwrap();
        if let Some(ref p) = *custom {
            if p.exists() {
                return Ok(p.clone());
            }
        }
        find_adb()
            .ok_or_else(|| AppError::AdbNotFound("ADB executable could not be found".to_string()))
    }

    pub fn execute(&self, args: &[&str]) -> AppResult<String> {
        let adb_path = self.get_adb_path()?;

        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;

        let mut cmd = Command::new(&adb_path);
        cmd.args(args);

        #[cfg(target_os = "windows")]
        {
            // CREATE_NO_WINDOW
            cmd.creation_flags(0x08000000);
        }

        let output = cmd.output().map_err(|e| {
            AppError::CommandFailed(format!("Failed to execute adb {:?}: {}", args, e))
        })?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if !output.status.success() {
            let details = if !stderr.trim().is_empty() {
                stderr.trim()
            } else if !stdout.trim().is_empty() {
                stdout.trim()
            } else {
                "No output"
            };
            return Err(AppError::CommandFailed(format!(
                "ADB command failed with exit code {:?}: {}",
                output.status.code(),
                details
            )));
        }

        Ok(stdout)
    }

    pub fn execute_for_device(&self, serial: &str, args: &[&str]) -> AppResult<String> {
        let mut full_args = vec!["-s", serial];
        full_args.extend_from_slice(args);
        self.execute(&full_args)
    }

    pub fn list_devices(&self) -> AppResult<Vec<AndroidDevice>> {
        let output = self.execute(&["devices", "-l"])?;
        let mut devices = parse_adb_devices(&output);

        // Enhance devices with manufacturer/model/androidVersion if device is authorized
        for device in &mut devices {
            if device.state == crate::models::DeviceState::Device {
                if let Ok(props) = self.get_device_properties(&device.serial) {
                    device.manufacturer = props.get("ro.product.manufacturer").cloned();
                    device.brand = props.get("ro.product.brand").cloned();
                    if device.model.is_none() {
                        device.model = props.get("ro.product.model").cloned();
                    }
                    device.android_version = props.get("ro.build.version.release").cloned();
                    device.api_level = props
                        .get("ro.build.version.sdk")
                        .and_then(|sdk| sdk.parse::<u32>().ok());
                }
            }
        }

        Ok(devices)
    }

    pub fn get_device_properties(&self, serial: &str) -> AppResult<HashMap<String, String>> {
        let output = self.execute_for_device(serial, &["shell", "getprop"])?;
        Ok(parse_getprop_output(&output))
    }

    pub fn get_battery_info(&self, serial: &str) -> AppResult<BatteryInfo> {
        let output = self.execute_for_device(serial, &["shell", "dumpsys", "battery"])?;
        Ok(parse_dumpsys_battery(&output))
    }

    pub fn get_full_device_info(&self, serial: &str) -> AppResult<DeviceInfo> {
        let props = self.get_device_properties(serial)?;
        let battery = self.get_battery_info(serial).unwrap_or_default();

        let resolution = self
            .execute_for_device(serial, &["shell", "wm", "size"])
            .unwrap_or_default();
        let density = self
            .execute_for_device(serial, &["shell", "wm", "density"])
            .unwrap_or_default();

        let model = props
            .get("ro.product.model")
            .cloned()
            .unwrap_or_else(|| "Unknown Model".to_string());
        let manufacturer = props
            .get("ro.product.manufacturer")
            .cloned()
            .unwrap_or_else(|| "Unknown Manufacturer".to_string());
        let brand = props
            .get("ro.product.brand")
            .cloned()
            .unwrap_or_else(|| "".to_string());
        let codename = props
            .get("ro.product.device")
            .cloned()
            .unwrap_or_else(|| "".to_string());
        let android_version = props
            .get("ro.build.version.release")
            .cloned()
            .unwrap_or_else(|| "Unknown".to_string());
        let api_level = props
            .get("ro.build.version.sdk")
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(0);
        let build_id = props
            .get("ro.build.display.id")
            .cloned()
            .unwrap_or_else(|| "".to_string());

        let res_clean = resolution
            .lines()
            .find(|l| l.contains("Physical size:"))
            .and_then(|l| l.strip_prefix("Physical size:"))
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        let dens_clean = density
            .lines()
            .find(|l| l.contains("Physical density:"))
            .and_then(|l| l.strip_prefix("Physical density:"))
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        let connection_type = if serial.contains(':') {
            ConnectionType::TcpIp
        } else {
            ConnectionType::Usb
        };

        Ok(DeviceInfo {
            serial: serial.to_string(),
            model,
            manufacturer,
            brand,
            codename,
            android_version,
            api_level,
            build_id,
            screen_resolution: res_clean,
            screen_density: dens_clean,
            battery,
            connection_type,
            supports_audio: api_level >= 30,           // Android 11+
            supports_camera: api_level >= 31,          // Android 12+
            supports_virtual_display: api_level >= 29, // Android 10+
        })
    }

    pub fn enable_tcpip(&self, serial: &str, port: u16) -> AppResult<String> {
        let port_str = port.to_string();
        self.execute_for_device(serial, &["tcpip", &port_str])
    }

    pub fn connect_wireless(&self, address: &str) -> AppResult<String> {
        let out = self.execute(&["connect", address])?;
        let normalized = out.to_ascii_lowercase();
        if normalized.contains("unable to connect")
            || normalized.contains("failed")
            || normalized.contains("cannot connect")
        {
            return Err(AppError::CommandFailed(out.trim().to_string()));
        }
        Ok(out.trim().to_string())
    }

    pub fn disconnect_wireless(&self, address: &str) -> AppResult<String> {
        let out = self.execute(&["disconnect", address])?;
        Ok(out.trim().to_string())
    }

    pub fn pair_wireless(&self, address: &str, code: &str) -> AppResult<String> {
        let out = self.execute(&["pair", address, code])?;
        let normalized = out.to_ascii_lowercase();
        if normalized.contains("failed") || normalized.contains("error") {
            return Err(AppError::CommandFailed(out.trim().to_string()));
        }
        Ok(out.trim().to_string())
    }

    pub fn push_file(
        &self,
        serial: &str,
        local_path: &str,
        remote_path: &str,
    ) -> AppResult<String> {
        let out = self.execute_for_device(serial, &["push", local_path, remote_path])?;
        Ok(out.trim().to_string())
    }

    pub fn pull_file(
        &self,
        serial: &str,
        remote_path: &str,
        local_path: &str,
    ) -> AppResult<String> {
        let out = self.execute_for_device(serial, &["pull", remote_path, local_path])?;
        Ok(out.trim().to_string())
    }

    pub fn install_apk(
        &self,
        serial: &str,
        apk_path: &str,
        reinstall: bool,
        downgrade: bool,
        grant_permissions: bool,
    ) -> AppResult<String> {
        let mut args = vec!["install"];
        if reinstall {
            args.push("-r");
        }
        if downgrade {
            args.push("-d");
        }
        if grant_permissions {
            args.push("-g");
        }
        args.push(apk_path);

        let out = self.execute_for_device(serial, &args)?;
        let normalized = out.to_ascii_lowercase();
        if normalized.contains("failure") || normalized.contains("failed") {
            return Err(AppError::CommandFailed(out.trim().to_string()));
        }
        Ok(out.trim().to_string())
    }

    pub fn take_screenshot(&self, serial: &str, target_path: &str) -> AppResult<String> {
        let adb_path = self.get_adb_path()?;

        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;

        let mut cmd = Command::new(&adb_path);
        cmd.args(["-s", serial, "exec-out", "screencap", "-p"]);

        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000);
        }

        let output = cmd
            .output()
            .map_err(|e| AppError::CommandFailed(format!("Failed to execute screencap: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::CommandFailed(
                "Failed to capture screenshot".to_string(),
            ));
        }

        if let Some(parent) = std::path::Path::new(target_path).parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        std::fs::write(target_path, &output.stdout)
            .map_err(|e| AppError::Io(format!("Failed to save screenshot file: {}", e)))?;

        Ok(target_path.to_string())
    }

    pub fn reboot_device(&self, serial: &str, mode: Option<&str>) -> AppResult<String> {
        let mut args = vec!["reboot"];
        if let Some(m) = mode {
            if !m.is_empty() {
                args.push(m);
            }
        }
        let out = self.execute_for_device(serial, &args)?;
        Ok(out.trim().to_string())
    }

    pub fn list_packages(&self, serial: &str, filter: Option<&str>) -> AppResult<Vec<String>> {
        let mut args = vec!["shell", "pm", "list", "packages", "-3"]; // 3rd-party first
        if filter.is_some() && filter.unwrap() == "all" {
            args.pop();
        }

        let out = self.execute_for_device(serial, &args)?;
        let mut pkgs = Vec::new();
        for line in out.lines() {
            let line = line.trim();
            if let Some(pkg) = line.strip_prefix("package:") {
                pkgs.push(pkg.to_string());
            }
        }
        pkgs.sort();
        Ok(pkgs)
    }

    pub fn start_server(&self) -> AppResult<String> {
        self.execute(&["start-server"])
    }

    pub fn kill_server(&self) -> AppResult<String> {
        self.execute(&["kill-server"])
    }
}
