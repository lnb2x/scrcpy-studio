# Security Policy

## Supported versions

Security fixes are applied to the latest released Scrcpy Studio version.

## Reporting a vulnerability

Please use GitHub's private security advisory reporting for `lnb2x/scrcpy-studio`. Do not open a public issue for vulnerabilities involving command execution, path traversal, updater signatures, ADB authorization, or sensitive data exposure.

Include the affected version, reproduction steps, impact, and any proposed mitigation. Avoid attaching device identifiers, private keys, pairing codes, or personal files.

## Security boundaries

Scrcpy Studio spawns scrcpy and ADB directly with argv arrays; it does not execute user input through `cmd.exe` or a shell. Automatic updates require a Tauri signature. The signature check cannot be disabled. Runtime executables are not downloaded automatically by the application; users must choose trusted upstream distributions or package managers.
