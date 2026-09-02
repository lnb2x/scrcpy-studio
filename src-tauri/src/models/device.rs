use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum DeviceState {
    Device,
    Offline,
    Unauthorized,
    Authorizing,
    Bootloader,
    Recovery,
    Sideload,
    #[default]
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionType {
    #[default]
    Usb,
    TcpIp,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AndroidDevice {
    pub serial: String,
    pub state: DeviceState,
    pub connection_type: ConnectionType,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub brand: Option<String>,
    pub device: Option<String>,
    pub android_version: Option<String>,
    pub api_level: Option<u32>,
    pub is_selected: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct BatteryInfo {
    pub level: Option<u32>,
    pub is_charging: Option<bool>,
    pub temperature: Option<f32>,
    pub voltage: Option<u32>,
    pub health: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub serial: String,
    pub model: String,
    pub manufacturer: String,
    pub brand: String,
    pub codename: String,
    pub android_version: String,
    pub api_level: u32,
    pub build_id: String,
    pub screen_resolution: String,
    pub screen_density: String,
    pub battery: BatteryInfo,
    pub connection_type: ConnectionType,
    pub supports_audio: bool,
    pub supports_camera: bool,
    pub supports_virtual_display: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MdnsService {
    pub name: String,
    pub service_type: String,
    pub address: String,
    pub is_pairing: bool,
}
