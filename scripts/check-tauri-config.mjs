import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(resolve(repoRoot, relativePath), 'utf8');
const config = JSON.parse(read('client/src-tauri/tauri.conf.json'));
const bundle = config.bundle ?? {};
if (bundle.category !== 'Graphics and Design') {
  console.error(`Invalid Tauri bundle category: ${bundle.category}`);
  process.exit(1);
}
if (config.identifier !== 'com.zasnetwx.broadcast') {
  console.error(`Unexpected Tauri bundle identifier: ${config.identifier}`);
  process.exit(1);
}
const packageVersion = JSON.parse(read('client/package.json')).version;
const cargoVersion = read('client/src-tauri/Cargo.toml').match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (!cargoVersion || config.version !== packageVersion || config.version !== cargoVersion) {
  console.error({ packageVersion, tauriVersion: config.version, cargoVersion });
  process.exit(1);
}
if (!fs.existsSync(resolve(repoRoot, 'client/src-tauri/icons/icon.svg'))) {
  console.error('Missing required source icon: client/src-tauri/icons/icon.svg');
  process.exit(1);
}
console.log(`Tauri bundle metadata valid: ${bundle.category}`);
