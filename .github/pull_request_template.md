## Summary

Describe the user-visible result and important implementation choices.

## Verification

- [ ] `npm run lint`
- [ ] `npm run check:versions`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml --locked`
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings`

## Safety

- [ ] No secrets, runtime binaries, personal device data, or generated artifacts were committed.
- [ ] External processes still use executable + argv arrays without a shell.
- [ ] English and Vietnamese translation keys remain in parity.
