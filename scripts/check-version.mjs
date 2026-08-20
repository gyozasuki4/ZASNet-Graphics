import { readFileSync } from 'node:fs';
const packageVersion = JSON.parse(readFileSync(new URL('../client/package.json', import.meta.url))).version;
const tauriVersion = JSON.parse(readFileSync(new URL('../client/src-tauri/tauri.conf.json', import.meta.url))).version;
const cargo = readFileSync(new URL('../client/src-tauri/Cargo.toml', import.meta.url), 'utf8');
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (!cargoVersion || packageVersion !== tauriVersion || packageVersion !== cargoVersion) { console.error({ packageVersion, tauriVersion, cargoVersion }); process.exit(1); }
console.log(`version ${packageVersion}`);
