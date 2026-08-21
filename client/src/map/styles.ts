import type { StyleSpecification } from 'maplibre-gl';

export type MapStylePresetId = 'broadcast-gray' | 'classic' | 'broadcast-satellite';
export interface MapStylePreset { id: MapStylePresetId; name: string; style: StyleSpecification; }

function rasterStyle(background: string, saturation: number, opacity: number): StyleSpecification {
  return {
    version: 8,
    sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' }, zasnetStates: { type: 'geojson', data: '/maps/us-states.json' }, zasnetCounties: { type: 'geojson', data: '/maps/us-counties.json' }, zasnetRoads: { type: 'geojson', data: '/maps/roads.geojson' }, zasnetCities: { type: 'geojson', data: '/maps/cities.geojson' } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': background } },
      { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': saturation, 'raster-contrast': 0.24, 'raster-brightness-min': 0.12, 'raster-brightness-max': 0.58, 'raster-opacity': opacity } },
      { id: 'county-boundaries', type: 'line', source: 'zasnetCounties', paint: { 'line-color': '#9bb5bd', 'line-width': 1, 'line-opacity': .55 } },
      { id: 'county-highlight', type: 'fill', source: 'zasnetCounties', paint: { 'fill-color': '#45c878', 'fill-opacity': 0.35 } },
      { id: 'state-boundaries', type: 'line', source: 'zasnetStates', paint: { 'line-color': '#dcecf0', 'line-width': 2.5, 'line-opacity': .9 } },
      { id: 'roads', type: 'line', source: 'zasnetRoads', minzoom: 4, filter: ['all', ['==', ['get', 'sov_a3'], 'USA'], ['in', ['get', 'type'], ['literal', ['Major Highway', 'Secondary Highway', 'Road']]]], paint: { 'line-color': '#d39b61', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, .5, 8, 1.8], 'line-opacity': .6 } },
      { id: 'road-labels', type: 'symbol', source: 'zasnetRoads', minzoom: 6, filter: ['all', ['==', ['get', 'sov_a3'], 'USA'], ['has', 'name']], layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-size': 10, 'text-allow-overlap': false }, paint: { 'text-color': '#f0c27c', 'text-halo-color': '#18272d', 'text-halo-width': 1.2, 'text-opacity': .75 } },
      { id: 'road-shields', type: 'symbol', source: 'zasnetRoads', minzoom: 7, filter: ['all', ['==', ['get', 'sov_a3'], 'USA'], ['has', 'name'], ['in', ['get', 'type'], ['literal', ['Major Highway', 'Secondary Highway']]]], layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-size': 9, 'text-padding': 3, 'text-allow-overlap': false }, paint: { 'text-color': '#f9f4df', 'text-halo-color': '#35556a', 'text-halo-width': 3, 'text-halo-blur': .2, 'text-opacity': .9 } },
      { id: 'city-labels', type: 'symbol', source: 'zasnetCities', minzoom: 4, filter: ['==', ['get', 'adm0_a3'], 'USA'], layout: { 'text-field': ['upcase', ['get', 'name']], 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 8, 14], 'text-allow-overlap': false, 'text-padding': 3 }, paint: { 'text-color': '#f2f7f8', 'text-halo-color': '#132027', 'text-halo-width': 1.5, 'text-opacity': .95 } },
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
