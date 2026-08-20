# Changelog

## 0.4.0 — Live radar acquisition and looping

- Added NWS RPCCDS KRIW product 94 live acquisition with retry, stale detection, persistent frame indexing, and status/frame APIs.
- Added bounded client radar loops with 15/30/60 minute selection, playback controls, speed, end dwell, caching, and geometry reuse.
- Added NWS RPCCDS source integration and release packaging fixes. Desktop runtime validation remains pending; release binaries are unsigned and macOS packages are not notarized.

## 0.3.5 — Initial CI/CD milestone

- Added cross-platform Tauri client CI and tag-driven release packaging.
- Added Windows, macOS arm64, and Linux AppImage/deb build matrix.
- Added SHA-256 release checksums and unsigned-build documentation.
