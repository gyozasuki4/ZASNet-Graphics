import type { StyleSpecification } from 'maplibre-gl';

export type MapStylePresetId = 'broadcast-gray' | 'classic' | 'broadcast-satellite';
export interface MapStylePreset { id: MapStylePresetId; name: string; style: StyleSpecification; }

function rasterStyle(background: string, saturation: number, opacity: number): StyleSpecification {
  return {
    version: 8,
    sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': background } },
      { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': saturation, 'raster-contrast': 0.24, 'raster-brightness-min': 0.12, 'raster-brightness-max': 0.58, 'raster-opacity': opacity } },
    ],
  };
}

export const mapStylePresets: MapStylePreset[] = [
  { id: 'broadcast-gray', name: 'Broadcast Gray', style: rasterStyle('#20262b', -1, 0.65) },
  { id: 'classic', name: 'Classic', style: rasterStyle('#263238', -0.35, 0.78) },
  { id: 'broadcast-satellite', name: 'Broadcast Satellite (planned)', style: rasterStyle('#20262b', -1, 0.65) },
];

export const broadcastStyle = mapStylePresets[0].style;
export const mapSources = mapStylePresets.map(preset => ({ id: preset.id, name: preset.name, style: preset.style, attribution: '© OpenStreetMap contributors' }));
export function mapStyleForPreset(id: string | undefined): StyleSpecification { return mapStylePresets.find(preset => preset.id === id)?.style || broadcastStyle; }
