use crate::models::{AndroidDevice, BatteryInfo, ConnectionType, DeviceState};
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
                || line.chars().next().map_or(false, |c| c.is_ascii_digit()))
        {
            let parts: Vec<&str> = line.split_whitespace().collect();
            for p in parts {
                if p.contains('x') && p.chars().next().map_or(false, |c| c.is_ascii_digit()) {
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
