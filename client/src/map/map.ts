import maplibregl, { Map } from 'maplibre-gl';
import { mapStyleForPreset } from './styles';

const layerAliases: Record<string, string[]> = {
  states: ['state-boundaries', 'states'],
  counties: ['county-boundaries', 'counties'],
  roads: ['roads', 'road-labels'],
  labels: ['city-labels', 'place-labels', 'labels'],
};

export function createMap(container: HTMLElement, stylePreset = 'broadcast-gray'): Map {
  return new maplibregl.Map({ container, style: mapStyleForPreset(stylePreset), center: [-97.278, 35.333], zoom: 6, attributionControl: { compact: true } });
}

export function setMapLayerVisibility(map: Map, layer: string, visible: boolean) {
  const ids = layerAliases[layer] || [layer];
  for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}

export function setLayerVisibility(map: Map, layer: string, visible: boolean) { setMapLayerVisibility(map, layer, visible); }

export function applyMapLayerVisibility(map: Map, layers: Record<string, boolean>) {
  for (const [layer, visible] of Object.entries(layers)) setMapLayerVisibility(map, layer, visible);
}

export function resizeMapPreservingCamera(map: Map) {
  const center = map.getCenter();
  const camera = { center: [center.lng, center.lat] as [number, number], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
  map.resize();
  map.jumpTo(camera);
}
