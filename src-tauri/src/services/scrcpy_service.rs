use crate::models::{AppError, AppResult, ScrcpyConfig, ScrcpySession};
use crate::services::process_manager::ProcessManager;
use crate::utils::{
    find_scrcpy, parse_scrcpy_cameras, parse_scrcpy_encoders, CameraInfoItem, EncoderInfoItem,
};
use std::path::PathBuf;
use std::process::{Command, Output};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

const AUDIO_SOURCES: &[&str] = &[
    "output",
    "playback",
    "mic",
    "mic-unprocessed",
    "mic-camcorder",
    "mic-voice-recognition",
    "mic-voice-communication",
    "voice-call",
    "voice-call-uplink",
    "voice-call-downlink",
    "voice-performance",
];

const OTG_BLOCKED_CUSTOM_OPTIONS: &[&str] = &[
    "--audio-bit-rate",
    "--audio-buffer",
    "--audio-codec",
    "--audio-codec-options",
    "--audio-encoder",
    "--audio-output-buffer",
    "--camera-ar",
    "--camera-facing",
    "--camera-fps",
    "--camera-high-speed",
    "--camera-id",
    "--camera-size",
    "--camera-torch",
    "--camera-zoom",
    "--max-fps",
    "--max-size",
    "--new-display",
    "--no-audio",
    "--no-playback",
    "--no-video",
    "--record",
    "--record-format",
    "--record-orientation",
    "--video-bit-rate",
    "--video-buffer",
    "--video-codec",
    "--video-codec-options",
    "--video-encoder",
    "--video-source",
];

fn trimmed_non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

fn option_key(argument: &str) -> &str {
    argument.split_once('=').map_or(argument, |(key, _)| key)
}

fn validate_custom_argument(argument: &str) -> AppResult<()> {
    let argument = argument.trim();
    if argument.is_empty() {
        return Err(AppError::InvalidConfig(
            "Custom arguments cannot be empty".to_string(),
        ));
    }
    if argument
        .chars()
        .any(|character| matches!(character, '\0' | '\r' | '\n'))
    {
        return Err(AppError::InvalidConfig(
            "Custom arguments cannot contain null bytes or line breaks".to_string(),
        ));
    }

    let key = option_key(argument);
    let name = key.strip_prefix("--").ok_or_else(|| {
        AppError::InvalidConfig(format!(
            "Custom argument must be one long argv item: {argument}"
        ))
    })?;
    if name.is_empty()
        || !name
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        return Err(AppError::InvalidConfig(format!(
            "Invalid custom argument name: {key}"
        )));
    }

    Ok(())
}

fn append_custom_arguments(
    args: &mut Vec<String>,
    custom_args: Option<&[String]>,
    blocked_keys: &[&str],
) {
    let Some(custom_args) = custom_args else {
        return;
    };

    let mut seen = args
        .iter()
        .filter(|argument| argument.starts_with("--"))
        .map(|argument| option_key(argument).to_string())
        .collect::<std::collections::HashSet<_>>();

    for raw in custom_args {
        let argument = raw.trim();
        let key = option_key(argument);
        if !seen.contains(key) && !blocked_keys.contains(&key) {
            seen.insert(key.to_string());
            args.push(argument.to_string());
        }
    }
}

fn validate_config(config: &ScrcpyConfig) -> AppResult<()> {
    if let Some(port) = config.tunnel_port {
        if port == 0 {
            return Err(AppError::InvalidConfig(
                "Tunnel port must be between 1 and 65535".to_string(),
            ));
        }
    }

    if let Some(source) = trimmed_non_empty(config.audio_source.as_deref()) {
        if !AUDIO_SOURCES.contains(&source) {
            return Err(AppError::InvalidConfig(format!(
                "Unsupported audio source: {source}"
            )));
        }
    }

    if let Some(policy) = trimmed_non_empty(config.display_ime_policy.as_deref()) {
        if !["local", "fallback", "hide"].contains(&policy) {
            return Err(AppError::InvalidConfig(format!(
                "Unsupported display IME policy: {policy}"
            )));
        }
    }

    if let Some(color) = trimmed_non_empty(config.background_color.as_deref()) {
        let digits = color.strip_prefix('#').unwrap_or_default();
        if !matches!(digits.len(), 3 | 6) || !digits.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err(AppError::InvalidConfig(
                "Background color must use #RGB or #RRGGBB".to_string(),
            ));
        }
    }

    if let Some(bindings) = trimmed_non_empty(config.mouse_bind.as_deref()) {
        let valid_group = |group: &str| {
            group.len() == 4
                && group
                    .bytes()
                    .all(|byte| matches!(byte, b'+' | b'-' | b'b' | b'h' | b's' | b'n'))
        };
        let groups = bindings.split(':').collect::<Vec<_>>();
        if groups.is_empty() || groups.len() > 2 || !groups.into_iter().all(valid_group) {
            return Err(AppError::InvalidConfig(
                "Mouse binding must contain one or two groups of four bindings".to_string(),
            ));
        }
    }

    let mut custom_keys = std::collections::HashSet::new();
    for argument in config.custom_args.as_deref().unwrap_or_default() {
        validate_custom_argument(argument)?;
        let key = option_key(argument.trim());
        if !custom_keys.insert(key.to_string()) {
            return Err(AppError::InvalidConfig(format!(
                "Duplicate custom option: {key}"
            )));
        }
    }

    Ok(())
}

fn ensure_command_success(action: &str, output: &Output) -> AppResult<()> {
    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let details = [stderr.trim(), stdout.trim()]
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    let exit = output
        .status
        .code()
        .map_or_else(|| "signal".to_string(), |code| code.to_string());

    let message = if details.is_empty() {
        format!("{} failed with exit status {}", action, exit)
    } else {
        format!("{} failed with exit status {}: {}", action, exit, details)
    };

    Err(AppError::CommandFailed(message))
}

#[derive(Clone)]
pub struct ScrcpyService {
    custom_scrcpy_path: Arc<Mutex<Option<PathBuf>>>,
    process_manager: ProcessManager,
}

impl ScrcpyService {
    pub fn new(process_manager: ProcessManager) -> Self {
        Self {
            custom_scrcpy_path: Arc::new(Mutex::new(None)),
            process_manager,
        }
    }

    pub fn set_custom_path(&self, path: Option<PathBuf>) {
        let mut p = self
            .custom_scrcpy_path
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        *p = path;
    }

    pub fn get_scrcpy_path(&self) -> AppResult<PathBuf> {
        let custom = self
            .custom_scrcpy_path
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if let Some(ref p) = *custom {
            if p.exists() {
                return Ok(p.clone());
            }
        }
        find_scrcpy().ok_or_else(|| {
            AppError::ScrcpyNotFound("scrcpy executable could not be found".to_string())
        })
    }

    pub fn build_args(&self, config: &ScrcpyConfig) -> Vec<String> {
        let mut args = Vec::new();
        let camera_enabled = config.camera.as_ref().is_some_and(|camera| camera.enabled);
        let camera_size = config
            .camera
            .as_ref()
            .filter(|camera| camera.enabled)
            .and_then(|camera| trimmed_non_empty(camera.camera_size.as_deref()));

        // 1. Device selection
        if let Some(serial) = trimmed_non_empty(config.serial.as_deref()) {
            args.push("--serial".to_string());
            args.push(serial.to_string());
        }

        // 2. OTG Mode
        if config.otg_mode.unwrap_or(false) {
            args.push("--otg".to_string());
            // In OTG mode, video/audio/recording options are ignored
            if let Some(km) = trimmed_non_empty(config.keyboard_mode.as_deref()) {
                args.push(format!("--keyboard={}", km));
            }
            if let Some(mm) = trimmed_non_empty(config.mouse_mode.as_deref()) {
                args.push(format!("--mouse={}", mm));
            }
            if let Some(gm) = trimmed_non_empty(config.gamepad_mode.as_deref()) {
                args.push(format!("--gamepad={}", gm));
            }
            append_custom_arguments(
                &mut args,
                config.custom_args.as_deref(),
                OTG_BLOCKED_CUSTOM_OPTIONS,
            );
            return args;
        }

        // 3. Camera Mode
        if let Some(ref cam) = config.camera {
            if cam.enabled {
                args.push("--video-source=camera".to_string());

                if let Some(id) = trimmed_non_empty(cam.camera_id.as_deref()) {
                    args.push(format!("--camera-id={}", id));
                } else if let Some(facing) = trimmed_non_empty(cam.camera_facing.as_deref()) {
                    // scrcpy rejects --camera-id combined with --camera-facing.
                    args.push(format!("--camera-facing={}", facing));
                }
                if let Some(size) = camera_size {
                    args.push(format!("--camera-size={}", size));
                }
                if let Some(fps) = cam.camera_fps {
                    if fps > 0 {
                        args.push(format!("--camera-fps={}", fps));
                    }
                }
                if cam.camera_high_speed.unwrap_or(false) {
                    args.push("--camera-high-speed".to_string());
                }
                if cam.camera_torch.unwrap_or(false) {
                    args.push("--camera-torch".to_string());
                }
                if let Some(zoom) = cam.camera_zoom {
                    if zoom > 0.0 {
                        args.push(format!("--camera-zoom={}", zoom));
                    }
                }
                if camera_size.is_none() {
                    if let Some(ar) = trimmed_non_empty(cam.camera_ar.as_deref()) {
                        // scrcpy rejects --camera-size combined with --camera-ar.
                        args.push(format!("--camera-ar={}", ar));
                    }
                }
            }
        }

        // 4. Virtual Display
        if let Some(ref vd) = config.virtual_display {
            if vd.enabled {
                if let Some(res) = trimmed_non_empty(vd.resolution.as_deref()) {
                    if let Some(dpi) = vd.dpi {
                        args.push(format!("--new-display={}/{}", res, dpi));
                    } else {
                        args.push(format!("--new-display={}", res));
                    }
                } else if let Some(dpi) = vd.dpi {
                    args.push(format!("--new-display=/{}", dpi));
                } else {
                    args.push("--new-display".to_string());
                }

                if vd.flex_display.unwrap_or(false) {
                    args.push("--flex-display".to_string());
                }
                if !vd.destroy_content.unwrap_or(true) {
                    args.push("--no-vd-destroy-content".to_string());
                }
                if !vd.system_decorations.unwrap_or(true) {
                    args.push("--no-vd-system-decorations".to_string());
                }
                if let Some(app) = trimmed_non_empty(vd.start_app.as_deref()) {
                    args.push(format!("--start-app={}", app));
                }
            }
        }

        // 5. Video Options
        if config.video_enabled.unwrap_or(true) {
            if let Some(codec) = trimmed_non_empty(config.video_codec.as_deref()) {
                if codec != "h264" {
                    args.push(format!("--video-codec={}", codec));
                }
            }
            if let Some(size) = config.max_size {
                if size > 0 && (!camera_enabled || camera_size.is_none()) {
                    // scrcpy rejects --camera-size combined with --max-size.
                    args.push(format!("--max-size={}", size));
                }
            }
            if let Some(fps) = config.max_fps {
                if fps > 0 {
                    args.push(format!("--max-fps={}", fps));
                }
            }
            if let Some(bitrate) = trimmed_non_empty(config.video_bitrate.as_deref()) {
                args.push(format!("--video-bit-rate={}", bitrate));
            }
            if let Some(encoder) = trimmed_non_empty(config.video_encoder.as_deref()) {
                args.push(format!("--video-encoder={}", encoder));
            }
            if let Some(options) = trimmed_non_empty(config.video_codec_options.as_deref()) {
                args.push(format!("--video-codec-options={}", options));
            }
            if let Some(buffer) = config.video_buffer {
                if buffer > 0 {
                    args.push(format!("--video-buffer={}", buffer));
                }
            }
            if config.ignore_video_encoder_constraints.unwrap_or(false) {
                args.push("--ignore-video-encoder-constraints".to_string());
            }
            if config.no_downsize_on_error.unwrap_or(false) {
                args.push("--no-downsize-on-error".to_string());
            }
            if let Some(align) = config.min_size_alignment {
                if align > 1 {
                    args.push(format!("--min-size-alignment={}", align));
                }
            }
            if let Some(crop) = trimmed_non_empty(config.crop.as_deref()) {
                args.push(format!("--crop={}", crop));
            }
            if let Some(orient) = trimmed_non_empty(config.display_orientation.as_deref()) {
                if orient != "0" && orient != "auto" {
                    args.push(format!("--display-orientation={}", orient));
                }
            }
            if let Some(orient) = trimmed_non_empty(config.capture_orientation.as_deref()) {
                if orient != "0" {
                    args.push(format!("--capture-orientation={}", orient));
                }
            }
            if let Some(angle) = config.angle {
                if angle > 0.0 {
                    args.push(format!("--angle={}", angle));
                }
            }
        } else {
            args.push("--no-video".to_string());
        }

        // 6. Audio Options
        if config.audio_enabled.unwrap_or(true) {
            if let Some(source) = trimmed_non_empty(config.audio_source.as_deref()) {
                // Camera mode defaults to microphone audio, so an explicit
                // "output" choice must be forwarded instead of omitted.
                if source != "output" || camera_enabled {
                    args.push(format!("--audio-source={}", source));
                }
            }
            if let Some(codec) = trimmed_non_empty(config.audio_codec.as_deref()) {
                if codec != "opus" {
                    args.push(format!("--audio-codec={}", codec));
                }
            }
            if let Some(bitrate) = trimmed_non_empty(config.audio_bitrate.as_deref()) {
                args.push(format!("--audio-bit-rate={}", bitrate));
            }
            if let Some(buffer) = config.audio_buffer {
                if buffer > 0 && buffer != 50 {
                    args.push(format!("--audio-buffer={}", buffer));
                }
            }
            if let Some(buffer) = config.audio_output_buffer {
                if buffer != 10 {
                    args.push(format!("--audio-output-buffer={}", buffer));
                }
            }
            if config.audio_dup.unwrap_or(false) {
                args.push("--audio-dup".to_string());
            }
            if let Some(encoder) = trimmed_non_empty(config.audio_encoder.as_deref()) {
                args.push(format!("--audio-encoder={}", encoder));
            }
            if let Some(options) = trimmed_non_empty(config.audio_codec_options.as_deref()) {
                args.push(format!("--audio-codec-options={}", options));
            }
            if config.require_audio.unwrap_or(false) {
                args.push("--require-audio".to_string());
            }
        } else {
            args.push("--no-audio".to_string());
        }

        // 7. Input & Control
        if !config.control_enabled.unwrap_or(true) {
            args.push("--no-control".to_string());
        } else {
            if let Some(km) = trimmed_non_empty(config.keyboard_mode.as_deref()) {
                if km != "sdk" {
                    args.push(format!("--keyboard={}", km));
                }
            }
            if let Some(mm) = trimmed_non_empty(config.mouse_mode.as_deref()) {
                if mm != "sdk" {
                    args.push(format!("--mouse={}", mm));
                }
            }
            if let Some(gm) = trimmed_non_empty(config.gamepad_mode.as_deref()) {
                if gm != "disabled" {
                    args.push(format!("--gamepad={}", gm));
                }
            }
            if config.legacy_paste.unwrap_or(false) {
                args.push("--legacy-paste".to_string());
            }
            if !config.clipboard_autosync.unwrap_or(true) {
                args.push("--no-clipboard-autosync".to_string());
            }
            if config.show_touches.unwrap_or(false) {
                args.push("--show-touches".to_string());
            }
            if config.stay_awake.unwrap_or(false) {
                args.push("--stay-awake".to_string());
            }
            if config.turn_screen_off.unwrap_or(false) {
                args.push("--turn-screen-off".to_string());
            }
            if config.power_off_on_close.unwrap_or(false) {
                args.push("--power-off-on-close".to_string());
            }
            if config.no_power_on.unwrap_or(false) {
                args.push("--no-power-on".to_string());
            }
            if config.no_key_repeat.unwrap_or(false) {
                args.push("--no-key-repeat".to_string());
            }
            if config.prefer_text.unwrap_or(false) {
                args.push("--prefer-text".to_string());
            }
            if config.raw_key_events.unwrap_or(false) {
                args.push("--raw-key-events".to_string());
            }
            if let Some(timeout) = config.screen_off_timeout {
                args.push(format!("--screen-off-timeout={}", timeout));
            }
            if let Some(policy) = trimmed_non_empty(config.display_ime_policy.as_deref()) {
                args.push(format!("--display-ime-policy={}", policy));
            }
            if config.keep_active.unwrap_or(false) {
                args.push("--keep-active".to_string());
            }
            if let Some(bindings) = trimmed_non_empty(config.mouse_bind.as_deref()) {
                args.push(format!("--mouse-bind={}", bindings));
            }
            if config.no_mouse_hover.unwrap_or(false) {
                args.push("--no-mouse-hover".to_string());
            }
            if let Some(shortcut_mod) = trimmed_non_empty(config.shortcut_mod.as_deref()) {
                args.push(format!("--shortcut-mod={}", shortcut_mod));
            }
        }

        // 8. Window Options
        if config.fullscreen.unwrap_or(false) {
            args.push("--fullscreen".to_string());
        }
        if config.always_on_top.unwrap_or(false) {
            args.push("--always-on-top".to_string());
        }
        if config.window_borderless.unwrap_or(false) {
            args.push("--window-borderless".to_string());
        }
        if let Some(title) = trimmed_non_empty(config.window_title.as_deref()) {
            args.push(format!("--window-title={}", title));
        }
        if let Some(w) = config.window_width {
            if w > 0 {
                args.push(format!("--window-width={}", w));
            }
        }
        if let Some(h) = config.window_height {
            if h > 0 {
                args.push(format!("--window-height={}", h));
            }
        }
        if let Some(x) = trimmed_non_empty(config.window_x.as_deref()) {
            if x != "auto" {
                args.push(format!("--window-x={}", x));
            }
        }
        if let Some(y) = trimmed_non_empty(config.window_y.as_deref()) {
            if y != "auto" {
                args.push(format!("--window-y={}", y));
            }
        }
        if let Some(driver) = trimmed_non_empty(config.render_driver.as_deref()) {
            if driver != "auto" {
                args.push(format!("--render-driver={}", driver));
            }
        }
        if let Some(fit) = trimmed_non_empty(config.render_fit.as_deref()) {
            if fit != "letterbox" {
                args.push(format!("--render-fit={}", fit));
            }
        }
        if let Some(color) = trimmed_non_empty(config.background_color.as_deref()) {
            args.push(format!("--background-color={}", color));
        }
        if config.no_window.unwrap_or(false) {
            args.push("--no-window".to_string());
        }
        if config.no_window_aspect_ratio_lock.unwrap_or(false) {
            args.push("--no-window-aspect-ratio-lock".to_string());
        }
        if config.no_mipmaps.unwrap_or(false) {
            args.push("--no-mipmaps".to_string());
        }
        if config.disable_screensaver.unwrap_or(false) {
            args.push("--disable-screensaver".to_string());
        }
        if config.print_fps.unwrap_or(false) {
            args.push("--print-fps".to_string());
        }

        // 9. Recording
        if let Some(path) = trimmed_non_empty(config.record_path.as_deref()) {
            args.push(format!("--record={}", path));
            if let Some(format) = trimmed_non_empty(config.record_format.as_deref()) {
                args.push(format!("--record-format={}", format));
            }
            if let Some(orientation) = trimmed_non_empty(config.record_orientation.as_deref()) {
                args.push(format!("--record-orientation={}", orientation));
            }
        }
        if config.no_playback.unwrap_or(false) {
            args.push("--no-playback".to_string());
        } else {
            if config.no_video_playback.unwrap_or(false) {
                args.push("--no-video-playback".to_string());
            }
            if config.no_audio_playback.unwrap_or(false) {
                args.push("--no-audio-playback".to_string());
            }
        }

        // 10. Display ID & Time limit
        if let Some(disp_id) = config.display_id {
            if disp_id > 0 {
                args.push(format!("--display-id={}", disp_id));
            }
        }
        if let Some(limit) = config.time_limit {
            if limit > 0 {
                args.push(format!("--time-limit={}", limit));
            }
        }
        if let Some(host) = trimmed_non_empty(config.tunnel_host.as_deref()) {
            args.push(format!("--tunnel-host={}", host));
        }
        if let Some(port) = config.tunnel_port {
            if port > 0 {
                args.push(format!("--tunnel-port={}", port));
            }
        }
        if config.force_adb_forward.unwrap_or(false) {
            args.push("--force-adb-forward".to_string());
        }
        if config.kill_adb_on_close.unwrap_or(false) {
            args.push("--kill-adb-on-close".to_string());
        }
        if config.no_cleanup.unwrap_or(false) {
            args.push("--no-cleanup".to_string());
        }

        // 11. Custom argv items. Typed settings always win conflicts.
        append_custom_arguments(&mut args, config.custom_args.as_deref(), &[]);

        args
    }

    pub fn validated_args(&self, config: &ScrcpyConfig) -> AppResult<Vec<String>> {
        validate_config(config)?;
        Ok(self.build_args(config))
    }

    pub async fn start(
        &self,
        app_handle: AppHandle,
        config: ScrcpyConfig,
        mode: Option<String>,
    ) -> AppResult<ScrcpySession> {
        let scrcpy_path = self.get_scrcpy_path()?;
        let args = self.validated_args(&config)?;
        let serial = config.serial.unwrap_or_else(|| "default".to_string());
        let mode_str = mode.unwrap_or_else(|| "mirror".to_string());

        let exe_str = scrcpy_path.to_string_lossy().to_string();
        self.process_manager
            .start_session(app_handle, &exe_str, args, serial, mode_str)
            .await
    }

    pub async fn stop(&self, session_id: &str) -> AppResult<bool> {
        self.process_manager.stop_session(session_id).await
    }

    pub async fn get_sessions(&self) -> Vec<ScrcpySession> {
        self.process_manager.get_sessions().await
    }

    pub fn list_cameras(&self, serial: Option<&str>) -> AppResult<Vec<CameraInfoItem>> {
        let scrcpy_path = self.get_scrcpy_path()?;

        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;

        let mut cmd = Command::new(&scrcpy_path);
        if let Some(s) = trimmed_non_empty(serial) {
            cmd.args(["--serial", s]);
        }
        cmd.args(["--list-cameras", "--no-video", "--no-audio"]);

        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000);
        }

        let output = cmd
            .output()
            .map_err(|e| AppError::CommandFailed(format!("Failed to list cameras: {}", e)))?;
        ensure_command_success("scrcpy --list-cameras", &output)?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let combined = format!("{}\n{}", stdout, stderr);

        Ok(parse_scrcpy_cameras(&combined))
    }

    pub fn list_encoders(&self, serial: Option<&str>) -> AppResult<Vec<EncoderInfoItem>> {
        let scrcpy_path = self.get_scrcpy_path()?;

        #[cfg(target_os = "windows")]
        use std::os::windows::process::CommandExt;

        let mut cmd = Command::new(&scrcpy_path);
        if let Some(s) = trimmed_non_empty(serial) {
            cmd.args(["--serial", s]);
        }
        cmd.args(["--list-encoders", "--no-video", "--no-audio"]);

        #[cfg(target_os = "windows")]
        {
            cmd.creation_flags(0x08000000);
        }

        let output = cmd
            .output()
            .map_err(|e| AppError::CommandFailed(format!("Failed to list encoders: {}", e)))?;
        ensure_command_success("scrcpy --list-encoders", &output)?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let combined = format!("{}\n{}", stdout, stderr);

        Ok(parse_scrcpy_encoders(&combined))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::CameraConfig;
    use serde::Deserialize;

    #[derive(Deserialize)]
    struct CommandFixture {
        name: String,
        config: ScrcpyConfig,
        expected: Vec<String>,
    }

    fn service() -> ScrcpyService {
        ScrcpyService::new(ProcessManager::new())
    }

    fn has_arg(args: &[String], expected: &str) -> bool {
        args.iter().any(|arg| arg == expected)
    }

    #[test]
    fn matches_shared_typescript_rust_command_fixtures() {
        let fixtures: Vec<CommandFixture> =
            serde_json::from_str(include_str!("../../../tests/scrcpy-command-fixtures.json"))
                .expect("shared command fixtures must be valid JSON");

        for fixture in fixtures {
            let actual = service().build_args(&fixture.config);
            assert_eq!(actual, fixture.expected, "fixture failed: {}", fixture.name);
        }
    }

    #[test]
    fn tunnel_options_are_forwarded_and_validated() {
        let valid = ScrcpyConfig {
            tunnel_host: Some(" 127.0.0.1 ".to_string()),
            tunnel_port: Some(27183),
            ..ScrcpyConfig::default()
        };
        assert_eq!(
            service().validated_args(&valid).expect("valid tunnel"),
            ["--tunnel-host=127.0.0.1", "--tunnel-port=27183"]
        );

        let invalid = ScrcpyConfig {
            tunnel_port: Some(0),
            ..ScrcpyConfig::default()
        };
        assert!(matches!(
            service().validated_args(&invalid),
            Err(AppError::InvalidConfig(_))
        ));
    }

    #[test]
    fn camera_specific_options_resolve_conflicts() {
        let config = ScrcpyConfig {
            serial: Some("  device-1  ".to_string()),
            video_codec: Some("  h264  ".to_string()),
            max_size: Some(1600),
            audio_source: Some("  output  ".to_string()),
            camera: Some(CameraConfig {
                enabled: true,
                camera_id: Some("  0  ".to_string()),
                camera_facing: Some("  back  ".to_string()),
                camera_size: Some("  1920x1080  ".to_string()),
                camera_zoom: Some(1.5),
                camera_ar: Some("  16:9  ".to_string()),
                ..CameraConfig::default()
            }),
            ..ScrcpyConfig::default()
        };

        let args = service().build_args(&config);

        assert!(has_arg(&args, "device-1"));
        assert!(has_arg(&args, "--video-source=camera"));
        assert!(has_arg(&args, "--camera-id=0"));
        assert!(has_arg(&args, "--camera-size=1920x1080"));
        assert!(has_arg(&args, "--camera-zoom=1.5"));
        assert!(has_arg(&args, "--audio-source=output"));
        assert!(!has_arg(&args, "--camera-facing=back"));
        assert!(!has_arg(&args, "--camera-ar=16:9"));
        assert!(!has_arg(&args, "--max-size=1600"));
        assert!(!has_arg(&args, "--video-codec=h264"));
    }

    #[test]
    fn camera_facing_and_constraints_are_kept_without_explicit_id_or_size() {
        let config = ScrcpyConfig {
            max_size: Some(1280),
            camera: Some(CameraConfig {
                enabled: true,
                camera_id: Some("   ".to_string()),
                camera_facing: Some("  front  ".to_string()),
                camera_size: Some("   ".to_string()),
                camera_ar: Some("  4:3  ".to_string()),
                ..CameraConfig::default()
            }),
            ..ScrcpyConfig::default()
        };

        let args = service().build_args(&config);

        assert!(has_arg(&args, "--camera-facing=front"));
        assert!(has_arg(&args, "--camera-ar=4:3"));
        assert!(has_arg(&args, "--max-size=1280"));
        assert!(!args.iter().any(|arg| arg.starts_with("--camera-id=")));
        assert!(!args.iter().any(|arg| arg.starts_with("--camera-size=")));
    }

    #[test]
    fn camera_zoom_must_be_positive() {
        for zoom in [0.0, -1.0] {
            let config = ScrcpyConfig {
                camera: Some(CameraConfig {
                    enabled: true,
                    camera_zoom: Some(zoom),
                    ..CameraConfig::default()
                }),
                ..ScrcpyConfig::default()
            };

            let args = service().build_args(&config);
            assert!(!args.iter().any(|arg| arg.starts_with("--camera-zoom=")));
        }
    }

    #[test]
    fn trims_structured_string_arguments() {
        let config = ScrcpyConfig {
            video_codec: Some("  h265  ".to_string()),
            video_bitrate: Some("  8M  ".to_string()),
            audio_source: Some("  mic  ".to_string()),
            keyboard_mode: Some("  uhid  ".to_string()),
            window_title: Some("  Demo window  ".to_string()),
            record_path: Some("  capture.mp4  ".to_string()),
            custom_args: Some(vec!["  --always-on-top  ".to_string()]),
            ..ScrcpyConfig::default()
        };

        let args = service().build_args(&config);

        for expected in [
            "--video-codec=h265",
            "--video-bit-rate=8M",
            "--audio-source=mic",
            "--keyboard=uhid",
            "--window-title=Demo window",
            "--record=capture.mp4",
            "--always-on-top",
        ] {
            assert!(has_arg(&args, expected), "missing argument: {expected}");
        }
        assert!(args.iter().all(|arg| arg.trim() == arg));
    }

    #[cfg(windows)]
    fn failed_exit_status(code: u32) -> std::process::ExitStatus {
        use std::os::windows::process::ExitStatusExt;
        std::process::ExitStatus::from_raw(code)
    }

    #[cfg(unix)]
    fn failed_exit_status(code: u32) -> std::process::ExitStatus {
        use std::os::unix::process::ExitStatusExt;
        std::process::ExitStatus::from_raw((code << 8) as i32)
    }

    #[cfg(any(windows, unix))]
    #[test]
    fn nonzero_probe_exit_becomes_command_failed() {
        let output = Output {
            status: failed_exit_status(7),
            stdout: b"partial stdout".to_vec(),
            stderr: b"probe failed".to_vec(),
        };

        let error = ensure_command_success("scrcpy --list-cameras", &output).unwrap_err();

        match error {
            AppError::CommandFailed(message) => {
                assert!(message.contains("scrcpy --list-cameras"));
                assert!(message.contains("exit status 7"));
                assert!(message.contains("probe failed"));
                assert!(message.contains("partial stdout"));
            }
            other => panic!("unexpected error: {other}"),
        }
    }
}
