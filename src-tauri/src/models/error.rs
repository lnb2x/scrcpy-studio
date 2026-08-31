use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    ScrcpyNotFound(String),
    AdbNotFound(String),
    DeviceNotFound(String),
    DeviceUnauthorized(String),
    DeviceOffline(String),
    CommandFailed(String),
    ProcessFailed(String),
    Io(String),
    InvalidConfig(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::ScrcpyNotFound(msg) => write!(f, "scrcpy executable not found: {}", msg),
            AppError::AdbNotFound(msg) => write!(f, "ADB executable not found: {}", msg),
            AppError::DeviceNotFound(msg) => write!(f, "Device not found: {}", msg),
            AppError::DeviceUnauthorized(msg) => write!(f, "Device unauthorized: {}", msg),
            AppError::DeviceOffline(msg) => write!(f, "Device offline: {}", msg),
            AppError::CommandFailed(msg) => write!(f, "Command execution failed: {}", msg),
            AppError::ProcessFailed(msg) => write!(f, "Process failed: {}", msg),
            AppError::Io(msg) => write!(f, "IO error: {}", msg),
            AppError::InvalidConfig(msg) => write!(f, "Invalid configuration: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
