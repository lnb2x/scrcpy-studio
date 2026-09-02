# Contributing to Scrcpy Studio

Thank you for helping improve Scrcpy Studio. Keep changes focused, preserve the React/Tauri architecture, and never build external commands as shell strings.

## Development setup

Install Node.js 22, the stable Rust MSVC toolchain, Microsoft C++ Build Tools, and WebView2. Then run:

```powershell
npm ci
npm run tauri dev
```

Before opening a pull request, run:

```powershell
npm run lint
npm run check:versions
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
```

Command-builder changes must update the shared fixtures in `tests/scrcpy-command-fixtures.json`. Both the TypeScript preview and Rust launcher are tested against those fixtures.

## Pull requests

- Explain user-visible behavior and failure handling.
- Add focused tests for parser, storage, validation, or command changes.
- Keep English and Vietnamese translation keys synchronized.
- Do not commit generated bundles, runtime archives, phones' data, signing keys, or credentials.
