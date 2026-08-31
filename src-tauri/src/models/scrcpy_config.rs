use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct CameraConfig {
    pub enabled: bool,
    pub camera_id: Option<String>,
    pub camera_facing: Option<String>, // "front", "back", "external"
    pub camera_size: Option<String>,   // e.g. "1920x1080"
    pub camera_fps: Option<u32>,
    pub camera_high_speed: Option<bool>,
    pub camera_torch: Option<bool>,
    pub camera_zoom: Option<f32>,
    pub camera_ar: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct VirtualDisplayConfig {
    pub enabled: bool,
    pub resolution: Option<String>, // e.g. "1920x1080"
    pub dpi: Option<u32>,
    pub flex_display: Option<bool>,
    pub destroy_content: Option<bool>,
    pub system_decorations: Option<bool>,
    pub start_app: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ScrcpyConfig {
    pub serial: Option<String>,

    // Video options
    pub video_enabled: Option<bool>,
    pub video_codec: Option<String>, // "h264", "h265", "av1", "vp8", "vp9"
    pub max_size: Option<u32>,
    pub max_fps: Option<u32>,
    pub video_bitrate: Option<String>, // "8M", "16M", etc.
    pub video_encoder: Option<String>,
    pub video_buffer: Option<u32>,
    pub ignore_video_encoder_constraints: Option<bool>,
    pub min_size_alignment: Option<u32>,
    pub crop: Option<String>,
    pub display_orientation: Option<String>,
    pub capture_orientation: Option<String>,
    pub angle: Option<f32>,

    // Audio options
    pub audio_enabled: Option<bool>,
    pub audio_source: Option<String>, // "output", "playback", "mic", etc.
    pub audio_codec: Option<String>,  // "opus", "aac", "flac", "raw"
    pub audio_bitrate: Option<String>,
    pub audio_buffer: Option<u32>,
    pub audio_dup: Option<bool>,
    pub audio_encoder: Option<String>,
    pub require_audio: Option<bool>,

    // Control options
    pub control_enabled: Option<bool>,
    pub keyboard_mode: Option<String>, // "sdk", "uhid", "aoa", "disabled"
    pub mouse_mode: Option<String>,    // "sdk", "uhid", "aoa", "disabled"
    pub gamepad_mode: Option<String>,  // "disabled", "uhid", "aoa"
    pub legacy_paste: Option<bool>,
    pub clipboard_autosync: Option<bool>,
    pub show_touches: Option<bool>,
    pub stay_awake: Option<bool>,
    pub turn_screen_off: Option<bool>,
    pub power_off_on_close: Option<bool>,
    pub no_power_on: Option<bool>,
    pub no_key_repeat: Option<bool>,
    pub prefer_text: Option<bool>,
    pub raw_key_events: Option<bool>,

    // Window options
    pub fullscreen: Option<bool>,
    pub always_on_top: Option<bool>,
    pub window_borderless: Option<bool>,
    pub window_title: Option<String>,
    pub window_width: Option<u32>,
    pub window_height: Option<u32>,
    pub window_x: Option<String>,
    pub window_y: Option<String>,
    pub render_driver: Option<String>,
    pub render_fit: Option<String>, // "letterbox", "stretched", "unscaled"
    pub disable_screensaver: Option<bool>,
    pub print_fps: Option<bool>,

    // Recording options
    pub record_path: Option<String>,
    pub record_format: Option<String>, // "mp4", "mkv", "aac", "opus"
    pub record_orientation: Option<String>,
    pub no_playback: Option<bool>,

    // Modes & special configurations
    pub otg_mode: Option<bool>,
    pub display_id: Option<u32>,
    pub time_limit: Option<u32>,
    pub tunnel_host: Option<String>,
    pub tunnel_port: Option<u16>,
    pub force_adb_forward: Option<bool>,
    pub kill_adb_on_close: Option<bool>,

    // Sub-configs
    pub camera: Option<CameraConfig>,
    pub virtual_display: Option<VirtualDisplayConfig>,

    // Additional raw args
    pub custom_args: Option<Vec<String>>,
}
