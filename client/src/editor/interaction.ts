import type { MapCamera } from './RadarMapObject';

export function isPreviewShortcut(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey'>) {
  return (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p';
}
export function isPreviewExitKey(event: Pick<KeyboardEvent, 'key'>) { return event.key === 'Escape'; }
export function editorChromeVisible(mode: 'editor' | 'preview') { return mode === 'editor'; }
export function mapCameraPatch(camera: MapCamera) { return { properties: { center: camera.center, zoom: camera.zoom, bearing: camera.bearing, pitch: camera.pitch } }; }
export function preserveMapCameraOnResize(camera: MapCamera) { return { ...camera, center: [...camera.center] as [number, number] }; }
