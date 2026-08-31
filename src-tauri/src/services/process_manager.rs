use crate::models::{AppError, AppResult, LogEntry, ScrcpySession, SessionStatus};
use chrono::Utc;
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use uuid::Uuid;

fn session_status_from_exit_code(exit_code: Option<i32>) -> SessionStatus {
    match exit_code {
        Some(0) => SessionStatus::Stopped,
        Some(_) => SessionStatus::Failed,
        // A process terminated by the user or the operating system may not
        // expose an exit code. Treat it as stopped unless a concrete non-zero
        // status proves that the launch failed.
        None => SessionStatus::Stopped,
    }
}

struct ActiveProcess {
    session: ScrcpySession,
    child: Option<Child>,
}

#[derive(Clone)]
pub struct ProcessManager {
    processes: Arc<Mutex<HashMap<String, ActiveProcess>>>,
}

impl Default for ProcessManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start_session(
        &self,
        app_handle: AppHandle,
        executable_path: &str,
        args: Vec<String>,
        device_serial: String,
        mode: String,
    ) -> AppResult<ScrcpySession> {
        let session_id = Uuid::new_v4().to_string();
        let started_at = Utc::now().timestamp_millis();

        let mut cmd = Command::new(executable_path);
        cmd.args(&args);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            // CREATE_NO_WINDOW = 0x08000000 to prevent any cmd console window from opening for child processes
            cmd.creation_flags(0x08000000);
        }

        let mut child = cmd.spawn().map_err(|e| {
            AppError::ProcessFailed(format!(
                "Failed to launch scrcpy at {}: {}",
                executable_path, e
            ))
        })?;

        let pid = child.id();

        let session = ScrcpySession {
            id: session_id.clone(),
            device_serial: device_serial.clone(),
            process_id: pid,
            status: SessionStatus::Running,
            started_at,
            stopped_at: None,
            command: args.clone(),
            mode,
            exit_code: None,
            error_message: None,
        };

        // Capture stdout
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        {
            let mut procs = self.processes.lock().await;
            procs.insert(
                session_id.clone(),
                ActiveProcess {
                    session: session.clone(),
                    child: Some(child),
                },
            );
        }

        // Notify session started
        let _ = app_handle.emit("scrcpy:status", &session);

        let sid_stdout = session_id.clone();
        let app_stdout = app_handle.clone();
        if let Some(stdout) = stdout {
            tokio::spawn(async move {
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let level = if line.contains("ERROR:") || line.contains("[error]") {
                        "ERROR"
                    } else if line.contains("WARN:") || line.contains("[warn]") {
                        "WARN"
                    } else if line.contains("adb:") {
                        "ADB"
                    } else {
                        "SCRCPY"
                    };

                    let log_entry = LogEntry {
                        timestamp: Utc::now().timestamp_millis(),
                        session_id: Some(sid_stdout.clone()),
                        level: level.to_string(),
                        message: line.clone(),
                        raw: line,
                    };
                    let _ = app_stdout.emit("scrcpy:log", &log_entry);
                }
            });
        }

        let sid_stderr = session_id.clone();
        let app_stderr = app_handle.clone();
        if let Some(stderr) = stderr {
            tokio::spawn(async move {
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    let level = if line.contains("ERROR:")
                        || line.contains("failed")
                        || line.contains("error")
                    {
                        "ERROR"
                    } else if line.contains("WARN:") {
                        "WARN"
                    } else {
                        "INFO"
                    };

                    let log_entry = LogEntry {
                        timestamp: Utc::now().timestamp_millis(),
                        session_id: Some(sid_stderr.clone()),
                        level: level.to_string(),
                        message: line.clone(),
                        raw: line,
                    };
                    let _ = app_stderr.emit("scrcpy:log", &log_entry);
                }
            });
        }

        // Background monitor for process termination
        let processes_clone = self.processes.clone();
        let sid_exit = session_id.clone();
        let app_exit = app_handle.clone();

        tokio::spawn(async move {
            let mut child_opt = {
                let mut procs = processes_clone.lock().await;
                if let Some(proc) = procs.get_mut(&sid_exit) {
                    proc.child.take()
                } else {
                    None
                }
            };

            if let Some(mut child) = child_opt.take() {
                let status_res = child.wait().await;
                let exit_code = status_res.as_ref().ok().and_then(|s| s.code());
                let stopped_at = Utc::now().timestamp_millis();

                let mut procs = processes_clone.lock().await;
                if let Some(proc) = procs.get_mut(&sid_exit) {
                    proc.session.status = session_status_from_exit_code(exit_code);
                    proc.session.stopped_at = Some(stopped_at);
                    proc.session.exit_code = exit_code;

                    let _ = app_exit.emit("scrcpy:status", &proc.session);
                }
            }
        });

        Ok(session)
    }

    pub async fn stop_session(&self, session_id: &str) -> AppResult<bool> {
        let mut procs = self.processes.lock().await;
        if let Some(proc) = procs.get_mut(session_id) {
            proc.session.status = SessionStatus::Stopping;
            if let Some(mut child) = proc.child.take() {
                let _ = child.kill().await;
            } else if let Some(pid) = proc.session.process_id {
                #[cfg(target_os = "windows")]
                {
                    let _ = std::process::Command::new("taskkill")
                        .args(["/PID", &pid.to_string(), "/F", "/T"])
                        .output();
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = std::process::Command::new("kill")
                        .args(["-9", &pid.to_string()])
                        .output();
                }
            }
            proc.session.status = SessionStatus::Stopped;
            proc.session.stopped_at = Some(Utc::now().timestamp_millis());
            return Ok(true);
        }
        Ok(false)
    }

    pub async fn get_sessions(&self) -> Vec<ScrcpySession> {
        let mut procs = self.processes.lock().await;

        // Terminal sessions have already been emitted to the frontend, where a
        // bounded history is persisted. Removing them here keeps this long-lived
        // process table from growing for the entire application lifetime.
        procs.retain(|_, process| {
            matches!(
                process.session.status,
                SessionStatus::Starting | SessionStatus::Running | SessionStatus::Stopping
            )
        });

        procs
            .values()
            .map(|process| process.session.clone())
            .collect()
    }

    pub async fn get_session_by_device(&self, device_serial: &str) -> Option<ScrcpySession> {
        let procs = self.processes.lock().await;
        for p in procs.values() {
            if p.session.device_serial == device_serial
                && p.session.status == SessionStatus::Running
            {
                return Some(p.session.clone());
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn session(id: &str, status: SessionStatus) -> ScrcpySession {
        ScrcpySession {
            id: id.to_string(),
            device_serial: "device-1".to_string(),
            process_id: None,
            status,
            started_at: 1,
            stopped_at: None,
            command: vec![],
            mode: "mirror".to_string(),
            exit_code: None,
            error_message: None,
        }
    }

    #[test]
    fn nonzero_exit_codes_are_failures() {
        assert_eq!(
            session_status_from_exit_code(Some(0)),
            SessionStatus::Stopped
        );
        assert_eq!(
            session_status_from_exit_code(Some(1)),
            SessionStatus::Failed
        );
        assert_eq!(
            session_status_from_exit_code(Some(2)),
            SessionStatus::Failed
        );
        assert_eq!(session_status_from_exit_code(None), SessionStatus::Stopped);
    }

    #[tokio::test]
    async fn active_session_query_prunes_terminal_entries() {
        let manager = ProcessManager::new();
        {
            let mut processes = manager.processes.lock().await;
            processes.insert(
                "running".to_string(),
                ActiveProcess {
                    session: session("running", SessionStatus::Running),
                    child: None,
                },
            );
            processes.insert(
                "stopped".to_string(),
                ActiveProcess {
                    session: session("stopped", SessionStatus::Stopped),
                    child: None,
                },
            );
        }

        let active = manager.get_sessions().await;

        assert_eq!(active.len(), 1);
        assert_eq!(active[0].id, "running");
        assert_eq!(manager.processes.lock().await.len(), 1);
    }
}
