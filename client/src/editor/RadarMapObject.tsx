import { useEffect, useRef, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import { backendUrl, health, setBackendUrl } from '../api/backend';
import { radarFrames, radarMetadata, radarPayload, radarStatus, type RadarFrame, type RadarStatus } from '../api/radar';
import { createMap } from '../map/map';
import { decodeL3Z } from '../radar/l3z';
import { PALETTES } from '../radar/palette';
import { nextIndex, previousIndex, type PlaybackSpeed } from '../radar/loop';
import { RadarLayer } from '../radar/renderer/RadarLayer';
import type { DecodedL3, RadarMetadata } from '../radar/types';
import type { MapObjectProperties } from '../scenes/types';

interface Props { config: MapObjectProperties; editor?: boolean; }
const SITE = 'KRIW', PRODUCT = '94';
export function RadarMapObject({ config, editor = true }: Props) {
  const mapEl = useRef<HTMLDivElement>(null), mapRef = useRef<MlMap | null>(null), layerRef = useRef<RadarLayer | null>(null), cache = useRef(new Map<string, { decoded: DecodedL3; metadata: RadarMetadata }>());
  const [url, setUrl] = useState(backendUrl()), [frames, setFrames] = useState<RadarFrame[]>([]), [index, setIndex] = useState(0), [metadata, setMetadata] = useState<RadarMetadata>(), [status, setStatus] = useState<RadarStatus>({ site: SITE, product: PRODUCT, status: 'offline', latest_scan: null, age_seconds: null, frame_count_60m: 0 }), [online, setOnline] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [minutes, setMinutes] = useState(30), [speed, setSpeed] = useState<PlaybackSpeed>(1), [playing, setPlaying] = useState(true), [paletteName, setPaletteName] = useState(config.palette || PALETTES[0].name);
  const palette = PALETTES.find(item => item.name === paletteName) || PALETTES[0];
  useEffect(() => { if (!mapEl.current) return; const map = createMap(mapEl.current); mapRef.current = map; const layer = new RadarLayer(palette); layerRef.current = layer; map.on('load', () => { map.addLayer(layer); map.jumpTo({ center: config.center || [-108.477, 43.066], zoom: config.zoom || 6 }); }); return () => map.remove(); }, []);
  useEffect(() => { layerRef.current?.setPalette(palette); layerRef.current?.setOpacity(config.opacity ?? 0.85); layerRef.current?.setVisible(config.radar !== false); }, [palette, config.opacity, config.radar]);
  async function display(frame: RadarFrame, position: number) { if (!frame) return; try { const item = cache.current.get(frame.file_id) || { decoded: decodeL3Z(await radarPayload(frame.file_id)), metadata: await radarMetadata(frame.file_id) }; cache.current.set(frame.file_id, item); setMetadata(item.metadata); setIndex(position); layerRef.current?.setData(item.decoded, item.metadata); mapRef.current?.flyTo({ center: [item.metadata.longitude, item.metadata.latitude], zoom: config.zoom || 6, duration: 0 }); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to decode radar frame'); } }
  async function refresh() { setBusy(true); setError(''); try { if (!await health()) throw new Error('Backend offline'); setOnline(true); setStatus(await radarStatus(SITE, PRODUCT)); const list = await radarFrames(minutes, SITE, PRODUCT); setFrames(list); if (list.length) await display(list[list.length - 1], list.length - 1); } catch (cause) { setOnline(false); setError(cause instanceof Error ? cause.message : 'Unable to load radar'); } finally { setBusy(false); } }
  useEffect(() => { void refresh(); }, [minutes]);
  useEffect(() => { const timer = setInterval(() => { if (playing && frames.length > 1) setIndex(current => { const next = nextIndex(current, frames.length); void display(frames[next], next); return next; }); }, 5000 / speed); return () => clearInterval(timer); }, [playing, frames, speed]);
  function saveUrl() { try { const normalized = setBackendUrl(url); setUrl(normalized); void refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invalid backend URL'); } }
  return <div className="radar-map-object"><div ref={mapEl} className="radar-map-canvas" />{editor && <div className="radar-map-status"><span className={online ? 'status-live' : ''}>● {online ? 'LIVE' : 'OFFLINE'}</span>{metadata && <span>{metadata.radar_site} · {metadata.product_code}</span>}<span>{frames.length ? `${index + 1}/${frames.length}` : 'No frames'}</span>{error && <span className="status-error">{error}</span>}</div>}{editor && <div className="radar-map-controls"><input aria-label="Backend URL" value={url} onChange={event => setUrl(event.target.value)} onBlur={saveUrl} /><button onClick={() => void refresh()} disabled={busy}>{busy ? 'Loading…' : 'Reload'}</button><button onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Play'}</button><button onClick={() => { if (frames.length) { const next = previousIndex(index, frames.length); void display(frames[next], next); } }}>‹</button><button onClick={() => { if (frames.length) { const next = nextIndex(index, frames.length); void display(frames[next], next); } }}>›</button><select value={paletteName} onChange={event => setPaletteName(event.target.value)}>{PALETTES.map(item => <option key={item.name}>{item.name}</option>)}</select></div>}</div>;
}
