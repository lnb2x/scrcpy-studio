use serde::{Serialize, Serializer};
use std::fmt;

#[derive(Debug, Clone)]
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
    InvalidArgument(String),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ErrorPayload<'a> {
    code: &'static str,
    message: &'static str,
    details: &'a str,
    recoverable: bool,
    suggested_action: &'static str,
}

impl AppError {
    fn payload(&self) -> ErrorPayload<'_> {
        let (code, message, details, recoverable, suggested_action) = match self {
            AppError::ScrcpyNotFound(details) => (
                "SCRCPY_NOT_FOUND",
                "scrcpy could not be found or started.",
                details.as_str(),
                true,
                "Open Settings, run Auto Detect, or select scrcpy.exe.",
            ),
            AppError::AdbNotFound(details) => (
                "ADB_NOT_FOUND",
                "Android Debug Bridge could not be found or started.",
                details.as_str(),
                true,
                "Open Settings, run Auto Detect, or select adb.exe.",
            ),
            AppError::DeviceNotFound(details) => (
                "DEVICE_NOT_FOUND",
                "The selected Android device is no longer available.",
                details.as_str(),
                true,
                "Reconnect the device and refresh the device list.",
            ),
            AppError::DeviceUnauthorized(details) => (
                "DEVICE_UNAUTHORIZED",
                "This computer is not authorized for USB debugging.",
                details.as_str(),
                true,
                "Unlock the device and approve the USB debugging prompt.",
            ),
            AppError::DeviceOffline(details) => (
                "DEVICE_OFFLINE",
                "The selected Android device is offline.",
                details.as_str(),
                true,
                "Reconnect the device or restart the ADB server.",
            ),
            AppError::InvalidConfig(details) | AppError::InvalidArgument(details) => (
                "INVALID_CONFIG",
                "The requested configuration is invalid.",
                details.as_str(),
                true,
                "Review the highlighted settings and try again.",
            ),
            AppError::ProcessFailed(details) => (
                "SCRCPY_START_FAILED",
                "scrcpy could not start or terminate correctly.",
                details.as_str(),
                true,
                "Check Runtime diagnostics and the Logs page.",
            ),
            AppError::CommandFailed(details) => (
                "COMMAND_FAILED",
                "The external command did not complete successfully.",
                details.as_str(),
                true,
                "Check the device state and open Logs for details.",
            ),
            AppError::Io(details) => (
                "IO_ERROR",
                "A file or process operation failed.",
                details.as_str(),
                true,
                "Check the path and permissions, then try again.",
            ),
        };

        ErrorPayload {
            code,
            message,
            details,
            recoverable,
            suggested_action,
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.payload().serialize(serializer)
    }
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
            AppError::InvalidArgument(msg) => write!(f, "Invalid argument: {}", msg),
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
