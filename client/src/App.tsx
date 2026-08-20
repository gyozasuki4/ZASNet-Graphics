import { useEffect, useRef, useState } from 'react';
import type { Map } from 'maplibre-gl';
import { backendUrl, health, setBackendUrl } from './api/backend';
import { latestRadar, radarPayload } from './api/radar';
import { decodeL3Z } from './radar/l3z';
import { PALETTES } from './radar/palette';
import { RadarLayer } from './radar/renderer/RadarLayer';
import { createMap } from './map/map';
import type { RadarMetadata } from './radar/types';
type Mode = 'Raw' | 'Smooth' | 'Broadcast';
type Layers = { states:boolean; counties:boolean; roads:boolean; cities:boolean; radar:boolean };

export default function App() {
  const mapEl = useRef<HTMLDivElement>(null), mapRef = useRef<Map | null>(null), layerRef = useRef<RadarLayer | null>(null);
  const savedLayers = localStorage.getItem('zasnet.layers');
  const [url, setUrl] = useState(backendUrl()), [online, setOnline] = useState(false), [metadata, setMetadata] = useState<RadarMetadata>();
  const [palette, setPalette] = useState(PALETTES[0]), [mode, setMode] = useState<Mode>((localStorage.getItem('zasnet.mode') as Mode) || 'Broadcast');
  const [opacity, setOpacity] = useState(Number(localStorage.getItem('zasnet.opacity') || 85));
  const [layers, setLayers] = useState<Layers>(savedLayers ? JSON.parse(savedLayers) : {states:true,counties:true,roads:true,cities:true,radar:true});
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [program, setProgram] = useState(false), [gpu, setGpu] = useState('WebGL2: checking');
  useEffect(() => { if (!mapEl.current) return; const map = createMap(mapEl.current); mapRef.current = map; const layer = new RadarLayer(palette); layerRef.current = layer; map.on('load', () => { map.addLayer(layer); const gl = map.getCanvas().getContext('webgl2') as WebGL2RenderingContext | null; setGpu(gl ? `WebGL2 · ${gl.getParameter(gl.RENDERER) || 'GPU'}` : 'WebGL2 unavailable'); }); return () => map.remove(); }, []);
  useEffect(() => { layerRef.current?.setPalette(palette); }, [palette]);
  useEffect(() => { layerRef.current?.setVisible(layers.radar); localStorage.setItem('zasnet.layers', JSON.stringify(layers)); }, [layers]);
  useEffect(() => { layerRef.current?.setOpacity(opacity / 100); localStorage.setItem('zasnet.opacity', String(opacity)); }, [opacity]);
  useEffect(() => { layerRef.current?.setMode(mode); localStorage.setItem('zasnet.mode', mode); }, [mode]);
  async function loadLatest() { setBusy(true); setError(''); const started = performance.now(); try { const connected = await health(); setOnline(connected); if (!connected) throw new Error('Backend offline'); const m = await latestRadar(); setMetadata(m); const decoded = decodeL3Z(await radarPayload(m.file_id)); layerRef.current?.setData(decoded, m); mapRef.current?.flyTo({ center:[m.longitude,m.latitude], zoom:6, duration:700 }); console.debug(`Radar decode/render preparation ${(performance.now()-started).toFixed(1)}ms`, decoded.values.length); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load radar'); } finally { setBusy(false); } }
  useEffect(() => { void loadLatest(); }, []);
  async function saveUrl() { setBackendUrl(url); await loadLatest(); }
  async function fullscreen() { setProgram(v => !v); if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.(); }
  function toggleLayer(name: keyof Layers) { setLayers(current => ({ ...current, [name]: !current[name] })); }
  const layerItems:[keyof Layers,string][] = [['states','State boundaries'],['counties','County boundaries'],['roads','Major roads'],['cities','City labels'],['radar','Radar']];
  return <div className={program ? 'app program-mode' : 'app'}>
    <header><div className="brand">ZASNet <span>WX Broadcast Graphics</span></div><div className="connection">Backend <b className={online ? 'online' : 'offline'}>● {online ? 'Connected' : 'Offline'}</b></div></header>
    <main><section className="map-shell"><div ref={mapEl} className="map"/><div className="overlay">{metadata && <><b>{metadata.radar_site}</b><span>{metadata.product_name}</span><span>{metadata.elevation_angle.toFixed(1)}°</span><span>{new Date(metadata.scan_time).toISOString().slice(11,19)}Z</span></>}</div>{error && <div className="error">{error}</div>}</section>
      <aside><h2>Radar</h2><label>Backend URL<input value={url} onChange={e=>setUrl(e.target.value)} onBlur={()=>setBackendUrl(url)} onKeyDown={e=>e.key==='Enter'&&void saveUrl()}/></label><button onClick={()=>void saveUrl()} disabled={busy}>{busy?'Loading…':'Reload Latest'}</button>
        <label>Palette<select value={palette.name} onChange={e=>setPalette(PALETTES.find(p=>p.name===e.target.value)!)}>{PALETTES.map(p=><option key={p.name}>{p.name}</option>)}</select></label><label>Mode<select value={mode} onChange={e=>setMode(e.target.value as Mode)}><option>Raw</option><option>Smooth</option><option>Broadcast</option></select></label><label>Opacity <output>{opacity}%</output><input type="range" min="0" max="100" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label>
        <div className="layers"><h3>Map layers</h3>{layerItems.map(([name,label])=><label className="check" key={name}><input type="checkbox" checked={layers[name]} onChange={()=>toggleLayer(name)}/>{label}</label>)}</div><button onClick={()=>void fullscreen()}>Fullscreen Program</button>
        {metadata&&<div className="details"><div>{metadata.product_code} · {metadata.units}</div><div>{metadata.radial_count} radials × {metadata.gate_count} gates</div><div>{metadata.latitude.toFixed(3)}, {metadata.longitude.toFixed(3)}</div><div>{metadata.min_valid_dbz} to {metadata.max_valid_dbz} dBZ</div></div>}
      </aside></main><footer><span>{gpu}</span><span>Renderer: custom WebGL2 radar layer</span><span>Frame: {metadata?'loaded':'—'}</span></footer>
  </div>;
}
