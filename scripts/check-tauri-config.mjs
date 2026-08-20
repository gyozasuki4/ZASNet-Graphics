import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(resolve(repoRoot, relativePath), 'utf8');
const config = JSON.parse(read('client/src-tauri/tauri.conf.json'));
const capability = JSON.parse(read('client/src-tauri/capabilities/default.json'));
const bundle = config.bundle ?? {};
if (bundle.category !== 'Graphics and Design') {
  console.error(`Invalid Tauri bundle category: ${bundle.category}`);
  process.exit(1);
}
if (config.identifier !== 'com.zasnetwx.broadcast') {
  console.error(`Unexpected Tauri bundle identifier: ${config.identifier}`);
  process.exit(1);
}
const httpCapability = (capability.permissions ?? []).find(permission => typeof permission === 'object' && permission.identifier === 'http:default');
const httpUrls = (httpCapability?.allow ?? []).map(entry => entry.url);
if (!httpCapability || !httpUrls.includes('http://10.10.3.133:8080/**')) {
  console.error('Tauri HTTP capability must allow http://10.10.3.133:8080/**');
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
const iconPaths = bundle.icon ?? [];
const requiredIcons = ['icons/icon.ico', 'icons/icon.icns', 'icons/icon.png', 'icons/128x128.png'];
for (const icon of requiredIcons) {
  if (!iconPaths.includes(icon)) {
    console.error(`Tauri bundle icon is not configured: ${icon}`);
    process.exit(1);
  }
  const iconPath = resolve(repoRoot, 'client/src-tauri', icon);
  if (!fs.existsSync(iconPath)) {
    console.error(`Missing configured Tauri icon: client/src-tauri/${icon}`);
    process.exit(1);
  }
}
const icoBytes = fs.readFileSync(resolve(repoRoot, 'client/src-tauri/icons/icon.ico'));
if (icoBytes.length < 6 || icoBytes.readUInt16LE(0) !== 0 || icoBytes.readUInt16LE(2) !== 1 || icoBytes.readUInt16LE(4) < 1) {
  console.error('Configured Windows icon is not a valid ICO file');
  process.exit(1);
}
const icnsBytes = fs.readFileSync(resolve(repoRoot, 'client/src-tauri/icons/icon.icns'));
if (icnsBytes.length < 8 || icnsBytes.subarray(0, 4).toString('ascii') !== 'icns') {
  console.error('Configured macOS icon is not a valid ICNS file');
  process.exit(1);
}
for (const icon of iconPaths.filter(path => path.endsWith('.png'))) {
  const iconPath = resolve(repoRoot, 'client/src-tauri', icon);
  const bytes = fs.readFileSync(iconPath);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngSignature) || bytes.readUInt32BE(16) !== bytes.readUInt32BE(20) || bytes.readUInt32BE(16) < 32) {
    console.error(`Configured PNG icon must be square and at least 32px: client/src-tauri/${icon}`);
    process.exit(1);
  }
}
console.log(`Tauri bundle metadata valid: ${bundle.category}`);
