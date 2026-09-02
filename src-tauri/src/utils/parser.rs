use crate::models::{
    AndroidDevice, BatteryInfo, ConnectionType, DeviceState, MdnsService, RemoteFileEntry,
};
use regex::Regex;
use std::collections::HashMap;

pub fn parse_adb_devices(output: &str) -> Vec<AndroidDevice> {
    let mut devices = Vec::new();
    let lines = output.lines();

    for line in lines {
        let line = line.trim();
        if line.is_empty()
            || line.starts_with("List of devices attached")
            || line.starts_with("* daemon")
        {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let serial = parts[0].to_string();
        let state_str = if parts.len() > 1 { parts[1] } else { "unknown" };

        let state = match state_str {
            "device" => DeviceState::Device,
            "offline" => DeviceState::Offline,
            "unauthorized" => DeviceState::Unauthorized,
            "authorizing" => DeviceState::Authorizing,
            "bootloader" => DeviceState::Bootloader,
            "recovery" => DeviceState::Recovery,
            "sideload" => DeviceState::Sideload,
            _ => DeviceState::Unknown,
        };

        let connection_type = if serial.contains(':') {
            ConnectionType::TcpIp
        } else {
            ConnectionType::Usb
        };

        let mut model = None;
        let mut device_name = None;

        for part in &parts[2..] {
            if let Some(m) = part.strip_prefix("model:") {
                model = Some(m.replace('_', " "));
            } else if let Some(d) = part.strip_prefix("device:") {
                device_name = Some(d.to_string());
            }
        }

        devices.push(AndroidDevice {
            serial,
            state,
            connection_type,
            model,
            manufacturer: None,
            brand: None,
            device: device_name,
            android_version: None,
            api_level: None,
            is_selected: false,
        });
    }

    devices
}

pub fn parse_getprop_output(output: &str) -> HashMap<String, String> {
    let mut props = HashMap::new();
    let re = Regex::new(r"^\[([^\]]+)\]:\s*\[([^\]]*)\]$").unwrap();

    for line in output.lines() {
        let line = line.trim();
        if let Some(caps) = re.captures(line) {
            if let (Some(key), Some(val)) = (caps.get(1), caps.get(2)) {
                props.insert(key.as_str().to_string(), val.as_str().to_string());
            }
        }
    }

    props
}

pub fn parse_dumpsys_battery(output: &str) -> BatteryInfo {
    let mut info = BatteryInfo::default();

    for line in output.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("level:") {
            info.level = val.trim().parse::<u32>().ok();
        } else if let Some(val) = line.strip_prefix("AC powered:") {
            if val.trim() == "true" {
                info.is_charging = Some(true);
            }
        } else if let Some(val) = line.strip_prefix("USB powered:") {
            if val.trim() == "true" {
                info.is_charging = Some(true);
            }
        } else if let Some(val) = line.strip_prefix("Wireless powered:") {
            if val.trim() == "true" {
                info.is_charging = Some(true);
            }
        } else if let Some(val) = line.strip_prefix("temperature:") {
            if let Ok(temp_raw) = val.trim().parse::<f32>() {
                info.temperature = Some(temp_raw / 10.0);
            }
        } else if let Some(val) = line.strip_prefix("voltage:") {
            info.voltage = val.trim().parse::<u32>().ok();
        } else if let Some(val) = line.strip_prefix("health:") {
            info.health = match val.trim() {
                "2" => Some("Good".to_string()),
                "3" => Some("Overheat".to_string()),
                "4" => Some("Dead".to_string()),
                "5" => Some("Over Voltage".to_string()),
                _ => Some("Normal".to_string()),
            };
        } else if let Some(val) = line.strip_prefix("status:") {
            info.status = match val.trim() {
                "2" => {
                    info.is_charging = Some(true);
                    Some("Charging".to_string())
                }
                "3" => Some("Discharging".to_string()),
                "4" => Some("Not charging".to_string()),
                "5" => Some("Full".to_string()),
                _ => Some("Unknown".to_string()),
            };
        }
    }

    if info.is_charging.is_none() {
        info.is_charging = Some(false);
    }

    info
}

pub fn parse_scrcpy_version(output: &str) -> Option<String> {
    for line in output.lines() {
        let line = line.trim();
        if line.starts_with("scrcpy") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                return Some(parts[1].to_string());
            }
        }
    }
    None
}

pub fn parse_adb_version(output: &str) -> Option<String> {
    for line in output.lines() {
        let line = line.trim();
        if line.contains("Android Debug Bridge version") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(last) = parts.last() {
                return Some(last.to_string());
            }
        }
    }
    None
}

pub fn parse_adb_mdns_services(output: &str) -> Vec<MdnsService> {
    output
        .lines()
        .filter_map(|line| {
            let columns = line.split_whitespace().collect::<Vec<_>>();
            if columns.len() != 3 || !columns[1].starts_with("_adb") {
                return None;
            }
            Some(MdnsService {
                name: columns[0].to_string(),
                service_type: columns[1].to_string(),
                address: columns[2].to_string(),
                is_pairing: columns[1] == "_adb-tls-pairing._tcp",
            })
        })
        .collect()
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraInfoItem {
    pub id: String,
    pub facing: String,
    pub sizes: Vec<String>,
    pub fps: Vec<u32>,
}

pub fn parse_scrcpy_cameras(output: &str) -> Vec<CameraInfoItem> {
    let mut cameras = Vec::new();
    let mut current_id = String::new();
    let mut current_facing = String::new();
    let mut current_sizes = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        if line.starts_with("--camera-id=") {
            if !current_id.is_empty() {
                cameras.push(CameraInfoItem {
                    id: current_id.clone(),
                    facing: current_facing.clone(),
                    sizes: current_sizes.clone(),
                    fps: vec![30, 60],
                });
                current_sizes.clear();
            }
            if let Some(id) = line.strip_prefix("--camera-id=") {
                let id_parts: Vec<&str> = id.split_whitespace().collect();
                current_id = id_parts.first().unwrap_or(&"").to_string();
                if line.contains("facing back") || line.contains("(back") {
                    current_facing = "back".to_string();
                } else if line.contains("facing front") || line.contains("(front") {
                    current_facing = "front".to_string();
                } else {
                    current_facing = "external".to_string();
                }
            }
        } else if line.contains('x')
            && (line.starts_with("size ")
                || line.starts_with("- ")
                || line.chars().next().is_some_and(|c| c.is_ascii_digit()))
        {
            let parts: Vec<&str> = line.split_whitespace().collect();
            for p in parts {
                if p.contains('x') && p.chars().next().is_some_and(|c| c.is_ascii_digit()) {
                    current_sizes.push(p.to_string());
                }
            }
        }
    }

    if !current_id.is_empty() {
        cameras.push(CameraInfoItem {
            id: current_id,
            facing: current_facing,
            sizes: current_sizes,
            fps: vec![30, 60],
        });
    }

    cameras
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncoderInfoItem {
    pub codec: String,
    pub encoder_name: String,
    pub is_hardware: bool,
    pub media_type: String, // "video" or "audio"
}

pub fn parse_scrcpy_encoders(output: &str) -> Vec<EncoderInfoItem> {
    let mut encoders = Vec::new();
    let mut current_media_type = "video".to_string();

    for line in output.lines() {
        let line = line.trim();
        if line.contains("Audio encoders:") {
            current_media_type = "audio".to_string();
            continue;
        } else if line.contains("Video encoders:") {
            current_media_type = "video".to_string();
            continue;
        }

        if line.starts_with("--video-codec=")
            || line.starts_with("--audio-codec=")
            || line.starts_with("--video-encoder=")
            || line.starts_with("--audio-encoder=")
            || line.starts_with("scrcpy --")
        {
            let parts: Vec<&str> = line.split_whitespace().collect();
            let mut codec = String::new();
            let mut name = String::new();

            for part in parts {
                if let Some(c) = part.strip_prefix("--video-codec=") {
                    codec = c.to_string();
                } else if let Some(c) = part.strip_prefix("--audio-codec=") {
                    codec = c.to_string();
                } else if let Some(e) = part.strip_prefix("--video-encoder=") {
                    name = e.to_string();
                } else if let Some(e) = part.strip_prefix("--audio-encoder=") {
                    name = e.to_string();
                }
            }

            if !name.is_empty() {
                let is_hw = !name.contains(".google.") && !name.contains(".sw.");
                encoders.push(EncoderInfoItem {
                    codec,
                    encoder_name: name,
                    is_hardware: is_hw,
                    media_type: current_media_type.clone(),
                });
            }
        }
    }

    encoders
}

/// Parses `ls -la` output from an Android device shell.
///
/// Toybox (Android 6+) emits: `drwxrwx--x 4 root sdcard 4096 2024-05-06 20:15 Name`
/// Legacy toolbox emits:      `drwxrwx--x root sdcard 2016-01-01 12:00 Name` (no size column)
/// Entry names may contain spaces, so everything after the timestamp is the name.
pub fn parse_ls_output(output: &str) -> Vec<RemoteFileEntry> {
    let mut entries = Vec::new();

    for line in output.lines() {
        let line = line.trim_end_matches('\r').trim();
        if line.is_empty() || line.starts_with("total ") {
            continue;
        }

        let tokens: Vec<&str> = line.split_whitespace().collect();
        if tokens.len() < 3 {
            continue;
        }

        // Toybox rows start with a numeric link count; legacy toolbox rows do not
        // and carry no size column.
        let is_toybox = tokens.len() >= 8 && tokens[1].chars().all(|c| c.is_ascii_digit());
        let (name_start, size_token, date_range) = if is_toybox {
            (7usize, Some(tokens[4]), 5usize..7usize)
        } else if tokens.len() >= 6 {
            (5usize, None, 3usize..5usize)
        } else {
            continue;
        };

        let permissions = tokens[0].to_string();
        let name = tokens[name_start..].join(" ");
        if name.is_empty() || name == "." || name == ".." {
            continue;
        }
        // Resolve symlink display name (`link -> target` shows the link name only).
        let display_name = name.split(" -> ").next().unwrap_or(&name).to_string();

        let is_dir = permissions.starts_with('d');
        let size = if is_dir {
            0
        } else {
            size_token.and_then(|t| t.parse::<u64>().ok()).unwrap_or(0)
        };
        let modified = tokens[date_range].join(" ");

        entries.push(RemoteFileEntry {
            name: display_name,
            is_dir,
            size,
            modified,
            permissions,
        });
    }

    entries
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_toybox_ls_output_with_spaced_names() {
        let output = "total 128\r\n\
                      drwxrwx--x 4 root sdcard 4096 2024-05-06 20:15 Alarms\r\n\
                      -rw-rw---- 1 root sdcard 20480 2024-05-06 20:15 My File.txt\r\n\
                      lrwxrwxrwx 1 root root 21 2024-05-06 20:15 sgcard -> /storage/XXXX-XXXX\r\n";

        let entries = parse_ls_output(output);

        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].name, "Alarms");
        assert!(entries[0].is_dir);
        assert_eq!(entries[0].size, 0);
        assert_eq!(entries[0].modified, "2024-05-06 20:15");

        assert_eq!(entries[1].name, "My File.txt");
        assert!(!entries[1].is_dir);
        assert_eq!(entries[1].size, 20480);

        assert_eq!(entries[2].name, "sgcard");
        assert!(!entries[2].is_dir);
    }

    #[test]
    fn parses_legacy_toolbox_ls_output() {
        // Legacy toolbox has no link count and no size column.
        let output = "drwxrwx--x root sdcard 2016-01-01 12:00 Download\n\
                      -rw-rw---- root sdcard 2016-01-01 12:00 a.png\n";

        let entries = parse_ls_output(output);

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].name, "Download");
        assert!(entries[0].is_dir);
        assert_eq!(entries[1].size, 0);
        assert_eq!(entries[1].modified, "2016-01-01 12:00");
    }

    #[test]
    fn skips_dot_entries_and_garbage_lines() {
        let output = "total 64\n\
                      drwxrwx--x 2 root root 4096 2024-05-06 20:15 .\n\
                      drwxrwx--x 2 root root 4096 2024-05-06 20:15 ..\n\
                      Permission denied\n";

        let entries = parse_ls_output(output);

        assert!(entries.is_empty());
    }

    #[test]
    fn preserves_nonstandard_adb_device_states() {
        let output = "List of devices attached\n\
                      unauthorized-1 unauthorized usb:1-1\n\
                      offline-1 offline usb:1-2\n\
                      recovery-1 recovery usb:1-3\n\
                      bootloader-1 bootloader usb:1-4\n\
                      sideload-1 sideload usb:1-5\n";
        let devices = parse_adb_devices(output);
        assert_eq!(devices[0].state, DeviceState::Unauthorized);
        assert_eq!(devices[1].state, DeviceState::Offline);
        assert_eq!(devices[2].state, DeviceState::Recovery);
        assert_eq!(devices[3].state, DeviceState::Bootloader);
        assert_eq!(devices[4].state, DeviceState::Sideload);
    }

    #[test]
    fn parses_adb_mdns_service_discovery() {
        let output = "List of discovered mdns services\n\
          adb-pixel-QXjCrW _adb-tls-pairing._tcp 192.168.1.7:33861\n\
          adb-pixel-TnSdi9 _adb-tls-connect._tcp 192.168.1.7:33015\n";
        let services = parse_adb_mdns_services(output);
        assert_eq!(services.len(), 2);
        assert!(services[0].is_pairing);
        assert!(!services[1].is_pairing);
        assert_eq!(services[1].address, "192.168.1.7:33015");
    }

    #[test]
    fn parses_runtime_versions() {
        assert_eq!(
            parse_scrcpy_version("scrcpy 4.1 <https://github.com/Genymobile/scrcpy>\n"),
            Some("4.1".to_string())
        );
        assert_eq!(
            parse_adb_version("Android Debug Bridge version 1.0.41\nVersion 36.0.0-13206524\n"),
            Some("1.0.41".to_string())
        );
        assert_eq!(parse_scrcpy_version("not installed"), None);
        assert_eq!(parse_adb_version("not installed"), None);
    }
}
