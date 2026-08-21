import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import { health } from '../api/backend';
import { radarFrames, radarMetadata, radarPayload, radarStatus, type RadarFrame, type RadarStatus } from '../api/radar';
import { applyMapLayerVisibility, createMap, resizeMapPreservingCamera } from '../map/map';
import { mapStyleForPreset } from '../map/styles';
import { decodeL3Z } from '../radar/l3z';
import { PALETTES } from '../radar/palette';
import { nextIndex, previousIndex, type PlaybackSpeed } from '../radar/loop';
import { RadarLayer, type RadarDiagnostics } from '../radar/renderer/RadarLayer';
import type { DecodedL3, RadarMetadata } from '../radar/types';
import type { MapObjectProperties } from '../scenes/types';

export interface MapCamera { center: [number, number]; zoom: number; bearing: number; pitch: number; }
export interface RadarEditorStatus { online: boolean; status: RadarStatus; metadata?: RadarMetadata; frames: number; index: number; playing: boolean; error?: string; }
export interface RadarMapHandle { togglePlayback(): void; previous(): void; next(): void; seek(position: number): void; fitRadar(): boolean; resetCamera(): void; getCamera(): MapCamera | undefined; }
interface Props { config: MapObjectProperties; navigation?: boolean; cameraControlled?: boolean; onCameraChange?: (camera: MapCamera) => void; onStatus?: (status: RadarEditorStatus) => void; onDiagnostic?: (diagnostics: RadarDiagnostics) => void; }
const SITE = 'KRIW', PRODUCT = '94';
const DEFAULT_CAMERA: MapCamera = { center: [-108.477, 43.066], zoom: 6, bearing: 0, pitch: 0 };

export const RadarMapObject = forwardRef<RadarMapHandle, Props>(function RadarMapObject({ config, navigation = false, cameraControlled = false, onCameraChange, onStatus, onDiagnostic }, ref) {
  const mapEl = useRef<HTMLDivElement>(null), mapRef = useRef<MlMap | null>(null), layerRef = useRef<RadarLayer | null>(null), cache = useRef(new Map<string, { decoded: DecodedL3; metadata: RadarMetadata }>()), latestData = useRef<{ decoded: DecodedL3; metadata: RadarMetadata } | undefined>(undefined), configRef = useRef(config), cameraCallbackRef = useRef(onCameraChange), diagnosticCallbackRef = useRef(onDiagnostic), suppressMove = useRef(false), cameraControlledRef = useRef(cameraControlled), stylePresetRef = useRef(config.stylePreset || 'broadcast-gray');
  cameraCallbackRef.current = onCameraChange;
  diagnosticCallbackRef.current = onDiagnostic;
  cameraControlledRef.current = cameraControlled;
  const [frames, setFrames] = useState<RadarFrame[]>([]), [index, setIndex] = useState(0), [metadata, setMetadata] = useState<RadarMetadata>(), [status, setStatus] = useState<RadarStatus>({ site: SITE, product: PRODUCT, status: 'offline', latest_scan: null, age_seconds: null, frame_count_60m: 0 }), [online, setOnline] = useState(false), [error, setError] = useState(''), [minutes, setMinutes] = useState(Number(config.loopMinutes || 30)), [speed, setSpeed] = useState<PlaybackSpeed>((config.playbackSpeed || 1) as PlaybackSpeed), [playing, setPlaying] = useState(true);
  configRef.current = config;
  const palette = PALETTES.find(item => item.name === config.palette) || PALETTES[0];
  const readCamera = (): MapCamera | undefined => { const map = mapRef.current; if (!map) return undefined; const center = map.getCenter(); return { center: [center.lng, center.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }; };
  const publishStatus = (overrides: Partial<RadarEditorStatus> = {}) => onStatus?.({ online, status, metadata, frames: frames.length, index, playing, error: error || undefined, ...overrides });

  useImperativeHandle(ref, () => ({
    togglePlayback: () => setPlaying(value => !value),
    previous: () => setIndex(current => { if (!frames.length) return current; const next = previousIndex(current, frames.length); void display(frames[next], next); return next; }),
    next: () => setIndex(current => { if (!frames.length) return current; const next = nextIndex(current, frames.length); void display(frames[next], next); return next; }),
    seek: (position: number) => { if (!frames.length) return; const next = Math.max(0, Math.min(frames.length - 1, Math.round(position))); void display(frames[next], next); },
    fitRadar: () => { const bounds = layerRef.current?.getBoundingBox(); const map = mapRef.current; if (!bounds || !map) return false; map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 24, duration: 350 }); return true; },
    resetCamera: () => { const map = mapRef.current; if (!map) return; map.jumpTo({ center: DEFAULT_CAMERA.center, zoom: DEFAULT_CAMERA.zoom, bearing: DEFAULT_CAMERA.bearing, pitch: DEFAULT_CAMERA.pitch }); },
    getCamera: readCamera,
  }), [frames, onStatus]);

  useEffect(() => {
    if (!mapEl.current) return;
    const map = createMap(mapEl.current, configRef.current.stylePreset || 'broadcast-gray'); mapRef.current = map;
    const layer = new RadarLayer(palette, diagnostics => diagnosticCallbackRef.current?.(diagnostics)); layerRef.current = layer;
    const handleMove = () => { if (!suppressMove.current && !cameraControlledRef.current) { const camera = readCamera(); if (camera) cameraCallbackRef.current?.(camera); } };
    map.on('move', handleMove);
    map.on('load', () => { map.addLayer(layer); const c = configRef.current; map.jumpTo({ center: c.center || DEFAULT_CAMERA.center, zoom: c.zoom || DEFAULT_CAMERA.zoom, bearing: c.bearing || 0, pitch: c.pitch || 0 }); if (latestData.current) layer.setData(latestData.current.decoded, latestData.current.metadata); applyNavigation(); applyMapLayers(map); });
    const observer = new ResizeObserver(() => resizeMapPreservingCamera(map)); observer.observe(mapEl.current);
    return () => { observer.disconnect(); map.off('move', handleMove); map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  function applyNavigation() { const map = mapRef.current; if (!map) return; if (navigation) { map.dragPan.enable(); map.dragRotate.enable(); map.scrollZoom.enable(); map.touchZoomRotate.enable(); map.touchZoomRotate.enableRotation(); map.doubleClickZoom.enable(); } else { map.dragPan.disable(); map.dragRotate.disable(); map.scrollZoom.disable(); map.touchZoomRotate.disable(); map.doubleClickZoom.disable(); } }
  function applyMapLayers(map = mapRef.current) { if (!map || !map.isStyleLoaded()) return; applyMapLayerVisibility(map, { states: configRef.current.states, counties: configRef.current.counties, roads: configRef.current.roads, labels: configRef.current.labels }); }
  useEffect(() => { applyNavigation(); }, [navigation]);
  useEffect(() => { const map = mapRef.current; if (!map || !map.isStyleLoaded()) return; const current = readCamera(); const target = { center: config.center || DEFAULT_CAMERA.center, zoom: config.zoom || DEFAULT_CAMERA.zoom, bearing: config.bearing || 0, pitch: config.pitch || 0 }; if (!current || Math.abs(current.center[0] - target.center[0]) > 0.00001 || Math.abs(current.center[1] - target.center[1]) > 0.00001 || Math.abs(current.zoom - target.zoom) > 0.001 || Math.abs(current.bearing - target.bearing) > 0.01 || Math.abs(current.pitch - target.pitch) > 0.01) { suppressMove.current = true; map.jumpTo(target); suppressMove.current = false; } }, [config.center, config.zoom, config.bearing, config.pitch]);
  useEffect(() => { layerRef.current?.setPalette(palette); layerRef.current?.setOpacity(config.opacity ?? 0.85); layerRef.current?.setVisible(config.radar !== false); }, [palette, config.opacity, config.radar]);
  useEffect(() => { applyMapLayers(); }, [config.states, config.counties, config.roads, config.labels]);
  useEffect(() => {
    const map = mapRef.current, preset = config.stylePreset || 'broadcast-gray';
    if (!map || stylePresetRef.current === preset) return;
    stylePresetRef.current = preset;
    map.setStyle(mapStyleForPreset(preset));
    const restore = () => { if (!map.getLayer('zasnet-radar') && layerRef.current) map.addLayer(layerRef.current); if (latestData.current) layerRef.current?.setData(latestData.current.decoded, latestData.current.metadata); applyNavigation(); applyMapLayers(map); };
    map.once('styledata', restore);
    return () => { map.off('styledata', restore); };
  }, [config.stylePreset]);
  useEffect(() => { const nextMinutes = Number(config.loopMinutes || 30); if (nextMinutes !== minutes) setMinutes(nextMinutes); }, [config.loopMinutes]);
  useEffect(() => { const nextSpeed = (config.playbackSpeed || 1) as PlaybackSpeed; if (nextSpeed !== speed) setSpeed(nextSpeed); }, [config.playbackSpeed]);
  async function display(frame: RadarFrame, position: number) { if (!frame) return; try { const item = cache.current.get(frame.file_id) || { decoded: decodeL3Z(await radarPayload(frame.file_id)), metadata: await radarMetadata(frame.file_id) }; cache.current.set(frame.file_id, item); latestData.current = item; setMetadata(item.metadata); setIndex(position); layerRef.current?.setData(item.decoded, item.metadata); mapRef.current?.triggerRepaint(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to decode radar frame'); } }
  async function refresh() { setError(''); try { if (!await health()) throw new Error('Backend offline'); setOnline(true); const nextStatus = await radarStatus(SITE, PRODUCT); setStatus(nextStatus); const list = await radarFrames(minutes, SITE, PRODUCT); setFrames(list); if (list.length) await display(list[list.length - 1], list.length - 1); } catch (cause) { setOnline(false); setError(cause instanceof Error ? cause.message : 'Unable to load radar'); } }
  useEffect(() => { void refresh(); }, [minutes]);
  useEffect(() => { const handler = () => void refresh(); window.addEventListener('zasnet:backend-change', handler); return () => window.removeEventListener('zasnet:backend-change', handler); }, [minutes]);
  useEffect(() => { const timer = setInterval(() => { if (playing && frames.length > 1) setIndex(current => { const next = nextIndex(current, frames.length); void display(frames[next], next); return next; }); }, 5000 / speed); return () => clearInterval(timer); }, [playing, frames, speed]);
  useEffect(() => { publishStatus(); }, [online, status, metadata, frames, index, playing, error]);
  // The renderer deliberately contains no authoring controls or status overlays. Those belong to editor chrome.
  return <div className={`radar-map-object ${navigation ? 'map-camera-active' : ''}`} onPointerDown={event => navigation && event.stopPropagation()} onWheel={event => navigation && event.stopPropagation()}><div ref={mapEl} className="radar-map-canvas" aria-label="MapLibre radar map" /></div>;
});
