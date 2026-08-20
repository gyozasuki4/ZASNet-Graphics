# ZASNet WX Broadcast Graphics

ZASNet WX Broadcast Graphics is a cross-platform broadcast-weather graphics platform. The Ubuntu backend acquires, decodes, stores, and serves meteorological data; desktop workstations perform GPU rendering.

## Current status

- Backend: FastAPI, SQLite metadata, NEXRAD Level III ingest/MetPy decoding, native dBZ and geometry persistence.
- Client: Tauri 2, React, TypeScript, MapLibre GL JS, WebGL 2 custom radar layer, client-side `.l3z` decoding, palettes, smoothing modes, opacity, and fullscreen prototype.
- Step 3.5: GitHub Actions CI and tag-driven cross-platform installer automation.
- Step 4: configurable KRIW product 94 live polling worker, status/frame APIs, and client radar looping.

The current radar proof supports base reflectivity, including Level III product 94. Live acquisition is limited to the NWS RPCCDS KRIW feed and is explicitly disabled by default in configuration. Warnings, additional datasets, and broadcast output integrations are not implemented yet.

## Repository layout

`backend/` is the deployable Python service source. `client/` is the Tauri workstation source. Production deployment remains at `/opt/zasnet-broadcast` and is not this Git working tree; release builds contain only the client.

## Local client checks

```bash
cd client
npm ci
npm run test
npm run build
npm run tauri dev       # requires Rust and desktop Tauri prerequisites
npm run tauri build
```

The backend URL is configured in the client UI and persisted locally. The development default is `http://127.0.0.1:8080`.

## Releases

Versions are semantic and currently use `0.3.5` as the source version in `client/package.json`, Tauri configuration, and Cargo metadata. After updating all three and running `node scripts/check-version.mjs`, push a tag:

```bash
git tag v0.3.6
git push origin v0.3.6
```

The release workflow builds Windows x64, macOS arm64, and Linux x86_64 installers, attaches them to a GitHub Release, and publishes SHA-256 checksums. Builds are currently unsigned development artifacts.

## Security and data policy

Production databases, radar archives, decoded operational data, logs, credentials, certificates, and updater private keys are excluded from Git. The committed `.l3z` fixture is a small public test payload generated from the documented Unidata/MetPy sample.
