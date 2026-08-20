# ZASNet WX Broadcast Graphics client

This is the Step 3 cross-platform workstation prototype. It uses React, TypeScript, Tauri 2, MapLibre GL JS, WebGL 2, and fflate. The client connects to a configurable backend, loads `/api/v1/radar/TLX/94/latest`, downloads the persisted `.l3z` payload, decodes it locally into typed arrays, and draws native radar values in a MapLibre custom layer.

## Development

Requirements: Node.js 22+, npm, and (for installed desktop builds) Rust/Cargo plus the platform Tauri prerequisites. On a graphical workstation:

```bash
npm install
npm run test
npm run build
npm run tauri dev
npm run tauri build
```

The server default is `http://127.0.0.1:8080`. Change it in the Backend URL field; it is persisted in local storage. Tauri's HTTP plugin is used for native requests, avoiding a wildcard production CORS policy. The development map uses OpenStreetMap raster tiles with attribution and is not the final self-hosted PMTiles strategy.

## Controls and limitations

The prototype provides Broadcast Gray map styling, radar visibility through the custom layer, palette switching (ZASNet Broadcast, Classic, Grayscale Debug), opacity, Raw/Smooth/Broadcast shader modes, reload, UTC scan metadata, diagnostics, and a browser/Tauri fullscreen program view. It does not yet implement animation, live acquisition, warnings, other products, a dedicated second Tauri program window, production PMTiles, or signed update distribution. `src/settings/updateService.ts` is the updater abstraction placeholder; future packages must use Tauri's signed updater and explicit user action.

The `.l3z` decoder validates magic/version/header limits, zlib decompression, geometry counts, radial bounds, state codes, and typed-array sizes. The binary format is consumed unchanged from Step 2.
