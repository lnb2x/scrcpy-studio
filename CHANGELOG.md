# Changelog

All notable changes to Scrcpy Studio are documented here. The project follows Semantic Versioning.

## [Unreleased]

### Added

- Shared TypeScript/Rust scrcpy 4.1 command parity fixtures.
- Runtime diagnostics, executable tests, ADB repair, and startup environment checks.
- ADB mDNS wireless discovery with connection/pairing port separation.
- Versioned profile storage with migration from the legacy profile key.
- Signed Tauri updater infrastructure and tag-based Windows release workflow.

### Fixed

- `tunnelHost` and `tunnelPort` now emit `--tunnel-host` and `--tunnel-port` in both command builders.
- Voice-call uplink and downlink audio sources are supported end to end.
- Camera and custom-argument conflicts no longer generate duplicate or mutually exclusive options.
- Recording paths use supported containers and collision-safe filenames.
- Duplicate device sessions and failed scrcpy exits now produce useful state and stderr details.

## [0.1.0]

- Initial MVP release.
