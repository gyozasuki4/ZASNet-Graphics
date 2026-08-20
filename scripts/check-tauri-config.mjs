import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('client/src-tauri/tauri.conf.json', 'utf8'));
const bundle = config.bundle ?? {};
if (bundle.category !== 'Graphics and Design') {
  console.error(`Invalid Tauri bundle category: ${bundle.category}`);
  process.exit(1);
}
if (config.identifier !== 'com.zasnetwx.broadcast') {
  console.error(`Unexpected Tauri bundle identifier: ${config.identifier}`);
  process.exit(1);
}
console.log(`Tauri bundle metadata valid: ${bundle.category}`);
