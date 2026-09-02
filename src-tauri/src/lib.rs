pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use commands::*;
use services::{AdbService, ProcessManager, RuntimeService, ScrcpyService};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let process_manager = ProcessManager::new();
    let adb_service = AdbService::new();
    let scrcpy_service = ScrcpyService::new(process_manager.clone());
    let runtime_service = RuntimeService::new(scrcpy_service.clone(), adb_service.clone());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .manage(process_manager)
        .manage(adb_service)
        .manage(scrcpy_service)
        .manage(runtime_service)
        .invoke_handler(tauri::generate_handler![
            // System & Paths
            detect_executables,
            check_runtime,
            test_runtime,
            repair_runtime,
            updater_configured,
            prepare_recording_path,
            open_directory,
            set_custom_scrcpy_path,
            set_custom_adb_path,
            get_default_directories,
            app_close,
            app_minimize,
            app_toggle_maximize,
            // Devices
            list_devices,
            get_device_info,
            get_battery_info,
            // Scrcpy
            start_scrcpy,
            stop_scrcpy,
            get_active_sessions,
            build_command_args,
            list_cameras,
            list_encoders,
            // ADB
            adb_connect,
            adb_disconnect,
            adb_pair,
            adb_tcpip_enable,
            adb_push_file,
            adb_pull_file,
            adb_install_apk,
            adb_take_screenshot,
            adb_reboot_device,
            adb_list_packages,
            adb_kill_server,
            adb_start_server,
            adb_discover_mdns,
            adb_launch_app,
            adb_uninstall_app,
            adb_list_directory,
            adb_make_directory,
            adb_delete_path,
        ])
        .setup(|app| {
            if let Some(public_key) = option_env!("TAURI_UPDATER_PUBLIC_KEY") {
                if !public_key.trim().is_empty() {
                    app.handle().plugin(
                        tauri_plugin_updater::Builder::new()
                            .pubkey(public_key)
                            .build(),
                    )?;
                }
            }
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running scrcpy studio application");
}
