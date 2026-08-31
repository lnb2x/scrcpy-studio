use std::path::{Path, PathBuf};
use which::which;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutableDetection {
    pub scrcpy_path: Option<String>,
    pub scrcpy_version: Option<String>,
    pub adb_path: Option<String>,
    pub adb_version: Option<String>,
    pub is_scrcpy_ready: bool,
    pub is_adb_ready: bool,
    pub detected_locations: Vec<String>,
}

pub fn find_scrcpy() -> Option<PathBuf> {
    // 1. Check PATH
    if let Ok(path) = which("scrcpy") {
        if path.exists() {
            return Some(path);
        }
    }

    // 2. Check local application / relative directory
    let relative_candidates = [
        "scrcpy.exe",
        "scrcpy/scrcpy.exe",
        "tools/scrcpy/scrcpy.exe",
        "tools/scrcpy.exe",
        "../scrcpy/scrcpy.exe",
    ];
    for rel in relative_candidates {
        let p = PathBuf::from(rel);
        if p.exists() {
            return Some(p.canonicalize().unwrap_or(p));
        }
    }

    // 3. Check Windows specific locations
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        // Winget packages
        let winget_dir = Path::new(&local_appdata)
            .join("Microsoft")
            .join("WinGet")
            .join("Packages");
        if winget_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&winget_dir) {
                for entry in entries.flatten() {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    if file_name.contains("scrcpy") || file_name.contains("Genymobile.scrcpy") {
                        let path = entry.path();
                        // Look for scrcpy.exe directly or in subdirectories
                        if path.join("scrcpy.exe").exists() {
                            return Some(path.join("scrcpy.exe"));
                        }
                        if let Ok(sub_entries) = std::fs::read_dir(&path) {
                            for sub in sub_entries.flatten() {
                                let target = sub.path().join("scrcpy.exe");
                                if target.exists() {
                                    return Some(target);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. User profile / Scoop / Chocolatey
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let scoop_scrcpy = Path::new(&user_profile)
            .join("scoop")
            .join("apps")
            .join("scrcpy")
            .join("current")
            .join("scrcpy.exe");
        if scoop_scrcpy.exists() {
            return Some(scoop_scrcpy);
        }

        let scoop_shim = Path::new(&user_profile)
            .join("scoop")
            .join("shims")
            .join("scrcpy.exe");
        if scoop_shim.exists() {
            return Some(scoop_shim);
        }
    }

    // 5. C:\ roots
    let standard_roots = [
        r"C:\scrcpy\scrcpy.exe",
        r"C:\tools\scrcpy\scrcpy.exe",
        r"C:\Program Files\scrcpy\scrcpy.exe",
        r"C:\Program Files (x86)\scrcpy\scrcpy.exe",
        r"C:\ProgramData\chocolatey\bin\scrcpy.exe",
    ];

    for root in standard_roots {
        let p = PathBuf::from(root);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

pub fn find_adb() -> Option<PathBuf> {
    // 1. Check PATH
    if let Ok(path) = which("adb") {
        if path.exists() {
            return Some(path);
        }
    }

    // 2. Check side-by-side with scrcpy
    if let Some(scrcpy) = find_scrcpy() {
        if let Some(parent) = scrcpy.parent() {
            let candidate = parent.join("adb.exe");
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    // 3. Check Android SDK platform-tools
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let sdk_adb = Path::new(&local_appdata)
            .join("Android")
            .join("Sdk")
            .join("platform-tools")
            .join("adb.exe");
        if sdk_adb.exists() {
            return Some(sdk_adb);
        }
    }

    if let Ok(android_home) = std::env::var("ANDROID_HOME") {
        let sdk_adb = Path::new(&android_home)
            .join("platform-tools")
            .join("adb.exe");
        if sdk_adb.exists() {
            return Some(sdk_adb);
        }
    }

    if let Ok(android_sdk_root) = std::env::var("ANDROID_SDK_ROOT") {
        let sdk_adb = Path::new(&android_sdk_root)
            .join("platform-tools")
            .join("adb.exe");
        if sdk_adb.exists() {
            return Some(sdk_adb);
        }
    }

    // 4. Scoop / Choco / Relative
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let scoop_adb = Path::new(&user_profile)
            .join("scoop")
            .join("apps")
            .join("adb")
            .join("current")
            .join("platform-tools")
            .join("adb.exe");
        if scoop_adb.exists() {
            return Some(scoop_adb);
        }
    }

    let standard_roots = [
        r"C:\platform-tools\adb.exe",
        r"C:\tools\platform-tools\adb.exe",
        r"C:\Program Files\Android\platform-tools\adb.exe",
        r"C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe",
    ];

    for root in standard_roots {
        let p = PathBuf::from(root);
        if p.exists() {
            return Some(p);
        }
    }

    None
}
