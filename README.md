# Scrcpy Studio

[![CI](https://github.com/lnb2x/scrcpy-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/lnb2x/scrcpy-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Scrcpy Studio is a Windows desktop interface for managing Android devices and launching [scrcpy 4.1](https://github.com/Genymobile/scrcpy/releases/tag/v4.1) without assembling long command lines by hand. It is built with Tauri 2, Rust, React, TypeScript, and Tailwind CSS.

The app exposes a curated set of scrcpy options for common mirroring, camera, recording, OTG, and virtual-display workflows. Advanced users can append custom arguments when an option is not represented in the UI.

## Features

- Discover and inspect USB or wireless ADB devices.
- Launch multiple scrcpy sessions with presets for quality, latency, Wi-Fi, and battery use.
- Configure video, audio, input, window, and recording options with a live CLI preview.
- Mirror Android 12+ cameras and query available cameras or encoders.
- Pair and connect with Android Wireless Debugging without assuming the pairing port is the connection port.
- Install APKs, push files, capture screenshots, reboot devices, and browse third-party packages.
- Save custom profiles, session history, application settings, and wireless connection history locally.
- View scrcpy process output and session status in real time.
- Use English or Vietnamese UI text where translations are currently available.

## Requirements

Scrcpy Studio is currently Windows-focused and tested for Windows 10/11.

- [Node.js](https://nodejs.org/) `>=20.19.0` or `>=22.12.0`
- [Rust](https://www.rust-lang.org/tools/install) with the stable MSVC toolchain
- Microsoft C++ Build Tools and Windows SDK for Tauri builds
- [scrcpy 4.1](https://github.com/Genymobile/scrcpy/releases/tag/v4.1)
- Android SDK Platform Tools (`adb`)
- WebView2 Runtime, normally included with current Windows releases

Scrcpy and ADB are detected from `PATH` and common Winget, Scoop, Android SDK, and local installation paths. Custom executable paths can also be selected in Settings.

## Development

```powershell
git clone https://github.com/lnb2x/scrcpy-studio.git
cd scrcpy-studio
npm ci
npm run tauri dev
```

Useful checks:

```powershell
npm test
npm run lint
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
```

Create a production installer with:

```powershell
npm run tauri build
```

The repository does not commit generated executables, `node_modules`, frontend bundles, or Rust target artifacts. No official binary release is published yet; build from source for now.

## Project structure

```text
src/                    React application, Zustand stores, command builder, and tests
src-tauri/src/          Rust commands, services, models, parsers, and process management
src-tauri/capabilities/ Tauri permission configuration
public/                 Static application assets
```

The TypeScript command builder drives the preview and is covered by unit tests. The Rust builder remains authoritative for launched processes; parity tests cover options with special compatibility rules, including camera selection and sizing.

## Scope and safety

- This is an independent, unofficial GUI. It is not affiliated with or endorsed by Genymobile.
- Scrcpy Studio does not bundle or modify scrcpy; it launches the executable installed on your computer.
- Android camera mirroring requires Android 12 or newer. Audio forwarding requires Android 11 or newer.
- Device capability badges are inferred from Android API level and should be treated as compatibility guidance, not hardware certification.
- ADB access is powerful. Review device prompts and custom arguments before running them.

## Author

Scrcpy Studio was created and is maintained by [@lnb2x](https://github.com/lnb2x).

## Credits

[scrcpy](https://github.com/Genymobile/scrcpy) is created and maintained by Romain Vimont and Genymobile contributors under the Apache License 2.0.

## License

Scrcpy Studio is available under the [MIT License](LICENSE).
