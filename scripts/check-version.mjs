import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const packageJson = readJson('package.json');
const packageLock = readJson('package-lock.json');
const tauriConfig = readJson('src-tauri/tauri.conf.json');
const cargoToml = readFileSync(resolve(root, 'src-tauri/Cargo.toml'), 'utf8');
const cargoPackageStart = cargoToml.indexOf('[package]');
const cargoPackageEnd = cargoToml.indexOf('\n[', cargoPackageStart + '[package]'.length);
const cargoPackage = cargoToml.slice(
  cargoPackageStart,
  cargoPackageEnd === -1 ? undefined : cargoPackageEnd
);
const cargoVersion = cargoPackage.match(/^version\s*=\s*"([^"]+)"/mu)?.[1];

const versions = new Map([
  ['package.json', packageJson.version],
  ['package-lock.json', packageLock.version],
  ['package-lock root package', packageLock.packages?.['']?.version],
  ['src-tauri/Cargo.toml', cargoVersion],
  ['src-tauri/tauri.conf.json', tauriConfig.version],
]);

const expected = packageJson.version;
const mismatches = [...versions].filter(([, version]) => version !== expected);

const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined;
if (tag?.startsWith('v') && tag.slice(1) !== expected) {
  mismatches.push(['Git tag', tag.slice(1)]);
}

if (mismatches.length > 0) {
  console.error(`Version mismatch. Expected ${expected}:`);
  for (const [file, version] of mismatches) console.error(`- ${file}: ${String(version)}`);
  process.exitCode = 1;
} else {
  console.log(`Version synchronization check passed: ${expected}`);
}
