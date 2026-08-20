# Renderer architecture

```text
FastAPI /latest + metadata + .l3z
          ↓
TypeScript validation and fflate zlib decode
          ↓
Float32Array dBZ + Uint8Array state codes
          ↓
geodesic range/bearing gate corners (WGS-84 spherical approximation)
          ↓
MapLibre MercatorCoordinate custom WebGL 2 layer
          ↓
palette texture + opacity + Raw/Smooth/Broadcast shader mode
          ↓
controller or fullscreen program view
```

The renderer batches each gate as two triangles in one draw call. The geometry is reconstructed from each radial's actual start/end azimuth, first-gate range, spacing, and gate count; it does not assume one-degree radials. Destination points use an Earth-radius geodesic calculation before conversion to MapLibre mercator coordinates. Native decoded dBZ values are not modified; shader interpolation is presentation-only.

Step 4 can retain the layer and geometry descriptors while swapping the `DecodedL3` value/state buffers for successive frames. A future program window can be added as a second Tauri window without changing backend/API or decoder code.
