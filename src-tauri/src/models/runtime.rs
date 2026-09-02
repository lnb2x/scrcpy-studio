use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeStatus {
    Ready,
    Missing,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeComponent {
    pub name: String,
    pub path: Option<String>,
    pub version: Option<String>,
    pub status: RuntimeStatus,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentDiagnostics {
    pub scrcpy: RuntimeComponent,
    pub adb: RuntimeComponent,
    pub device_count: usize,
    pub device_states: Vec<String>,
    pub checked_at: i64,
}
