use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Starting,
    Running,
    Stopping,
    Stopped,
    Failed,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScrcpySession {
    pub id: String,
    pub device_serial: String,
    pub process_id: Option<u32>,
    pub status: SessionStatus,
    pub started_at: i64,
    pub stopped_at: Option<i64>,
    pub command: Vec<String>,
    pub mode: String, // "mirror", "camera", "otg", "virtual_display", "record"
    pub exit_code: Option<i32>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: i64,
    pub session_id: Option<String>,
    pub source: String,
    pub level: String, // "INFO", "ADB", "SCRCPY", "WARN", "ERROR"
    pub message: String,
    pub raw: String,
}
