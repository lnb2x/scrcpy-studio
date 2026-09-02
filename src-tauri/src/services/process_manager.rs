use crate::models::{AppError, AppResult, LogEntry, ScrcpySession, SessionStatus};
use chrono::Utc;
use std::collections::{HashMap, VecDeque};
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration, Instant};
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
        {
            let processes = self.processes.lock().await;
            if let Some(existing) = processes.values().find(|process| {
                process.session.device_serial == device_serial
                    && matches!(
                        process.session.status,
                        SessionStatus::Starting | SessionStatus::Running | SessionStatus::Stopping
                    )
            }) {
                return Err(AppError::InvalidConfig(format!(
                    "Device {} already has an active scrcpy session ({})",
                    device_serial, existing.session.id
                )));
            }
        }

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

        // Capture stdout/stderr before moving the child into its monitor task.
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let stderr_tail = Arc::new(Mutex::new(VecDeque::<String>::with_capacity(20)));

        {
            let mut procs = self.processes.lock().await;
            // Close the small race between the first duplicate check and spawn.
            if procs.values().any(|process| {
                process.session.device_serial == device_serial
                    && matches!(
                        process.session.status,
                        SessionStatus::Starting | SessionStatus::Running | SessionStatus::Stopping
                    )
            }) {
                let _ = child.start_kill();
                return Err(AppError::InvalidConfig(format!(
                    "Device {device_serial} already has an active scrcpy session"
                )));
            }
            procs.insert(
                session_id.clone(),
                ActiveProcess {
                    session: session.clone(),
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
                    let (source, level) = if line.contains("ERROR:") || line.contains("[error]") {
                        ("SCRCPY", "ERROR")
                    } else if line.contains("WARN:") || line.contains("[warn]") {
                        ("SCRCPY", "WARN")
                    } else if line.contains("adb:") {
                        ("ADB", "INFO")
                    } else {
                        ("SCRCPY", "INFO")
                    };

                    let log_entry = LogEntry {
                        timestamp: Utc::now().timestamp_millis(),
                        session_id: Some(sid_stdout.clone()),
                        source: source.to_string(),
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
        let stderr_tail_writer = stderr_tail.clone();
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

                    {
                        let mut tail = stderr_tail_writer.lock().await;
                        if tail.len() == 20 {
                            tail.pop_front();
                        }
                        tail.push_back(line.clone());
                    }

                    let log_entry = LogEntry {
                        timestamp: Utc::now().timestamp_millis(),
                        session_id: Some(sid_stderr.clone()),
                        source: "SCRCPY".to_string(),
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
            let status_result = child.wait().await;
            let exit_code = status_result
                .as_ref()
                .ok()
                .and_then(std::process::ExitStatus::code);
            let stopped_at = Utc::now().timestamp_millis();
            tokio::task::yield_now().await;
            let stderr_details = stderr_tail
                .lock()
                .await
                .iter()
                .cloned()
                .collect::<Vec<_>>()
                .join("\n");

            let mut procs = processes_clone.lock().await;
            if let Some(proc) = procs.get_mut(&sid_exit) {
                let was_stopping = proc.session.status == SessionStatus::Stopping;
                proc.session.status = if was_stopping {
                    SessionStatus::Stopped
                } else if status_result.is_err() {
                    SessionStatus::Failed
                } else {
                    session_status_from_exit_code(exit_code)
                };
                proc.session.stopped_at = Some(stopped_at);
                proc.session.exit_code = exit_code;
                if proc.session.status == SessionStatus::Failed {
                    proc.session.error_message = Some(if stderr_details.is_empty() {
                        status_result.map_or_else(
                            |error| format!("Could not wait for scrcpy process: {error}"),
                            |_| format!("scrcpy exited with status {}", exit_code.unwrap_or(-1)),
                        )
                    } else {
                        stderr_details
                    });
                }

                let _ = app_exit.emit("scrcpy:status", &proc.session);
            }
            // The frontend owns the bounded session history after the terminal
            // status event. Do not retain completed child processes indefinitely.
            procs.remove(&sid_exit);
        });

        Ok(session)
    }

    pub async fn stop_session(&self, session_id: &str) -> AppResult<bool> {
        let pid = {
            let mut procs = self.processes.lock().await;
            let Some(proc) = procs.get_mut(session_id) else {
                return Ok(false);
            };
            if !matches!(
                proc.session.status,
                SessionStatus::Starting | SessionStatus::Running
            ) {
                return Ok(false);
            }
            proc.session.status = SessionStatus::Stopping;
            proc.session.process_id
        };

        let Some(pid) = pid else {
            return Err(AppError::ProcessFailed(format!(
                "Session {session_id} has no process id"
            )));
        };

        terminate_process(pid, false).await?;

        let deadline = Instant::now() + Duration::from_secs(2);
        while Instant::now() < deadline {
            let is_terminal = {
                let procs = self.processes.lock().await;
                match procs.get(session_id) {
                    None => true,
                    Some(process) => matches!(
                        process.session.status,
                        SessionStatus::Stopped | SessionStatus::Failed
                    ),
                }
            };
            if is_terminal {
                return Ok(true);
            }
            sleep(Duration::from_millis(100)).await;
        }

        terminate_process(pid, true).await?;
        Ok(true)
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

async fn terminate_process(pid: u32, force: bool) -> AppResult<()> {
    #[cfg(target_os = "windows")]
    {
        let pid_text = pid.to_string();
        let mut command = Command::new("taskkill");
        command.args(["/PID", &pid_text, "/T"]);
        if force {
            command.arg("/F");
        }
        command.creation_flags(0x08000000);
        let output = command.output().await.map_err(|error| {
            AppError::ProcessFailed(format!("Could not terminate scrcpy process {pid}: {error}"))
        })?;
        // taskkill returns an error if the process exited between the status
        // check and this call. That is a successful stop from the user's view.
        if !output.status.success() && !force {
            return Ok(());
        }
        if !output.status.success() {
            let details = String::from_utf8_lossy(&output.stderr).to_ascii_lowercase();
            if !details.contains("not found") && !details.contains("no running instance") {
                return Err(AppError::ProcessFailed(format!(
                    "Could not terminate scrcpy process {pid}: {}",
                    details.trim()
                )));
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let signal = if force { "-KILL" } else { "-TERM" };
        let output = Command::new("kill")
            .args([signal, &pid.to_string()])
            .output()
            .await
            .map_err(|error| {
                AppError::ProcessFailed(format!(
                    "Could not terminate scrcpy process {pid}: {error}"
                ))
            })?;
        if !output.status.success() {
            let details = String::from_utf8_lossy(&output.stderr);
            if !details.contains("No such process") {
                return Err(AppError::ProcessFailed(format!(
                    "Could not terminate scrcpy process {pid}: {}",
                    details.trim()
                )));
            }
        }
    }

    Ok(())
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
                },
            );
            processes.insert(
                "stopped".to_string(),
                ActiveProcess {
                    session: session("stopped", SessionStatus::Stopped),
                },
            );
        }

        let active = manager.get_sessions().await;

        assert_eq!(active.len(), 1);
        assert_eq!(active[0].id, "running");
        assert_eq!(manager.processes.lock().await.len(), 1);
    }
}
