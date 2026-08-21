import { useRef, useState } from 'react';
import type { Scene, SceneObject, SceneObjectType } from '../scenes/types';
import { SceneThumbnail } from './SceneThumbnail';
import type { MapCamera, RadarEditorStatus, RadarMapHandle } from './RadarMapObject';
import { MapViewPresets } from './MapViewPresets';

const products: Array<{ type: SceneObjectType; title: string; category: string; icon: string; enabled: boolean }> = [
  { type: 'map', title: 'Radar Map', category: 'WEATHER', icon: '◉', enabled: true },
  { type: 'map', title: 'Map', category: 'WEATHER', icon: '▧', enabled: true },
  { type: 'text', title: 'Text', category: 'GRAPHICS', icon: 'T', enabled: true },
  { type: 'banner', title: 'Header Banner', category: 'GRAPHICS', icon: '▰', enabled: true },
  { type: 'image', title: 'Image', category: 'GRAPHICS', icon: '▤', enabled: true },
  { type: 'shape', title: 'Shape', category: 'GRAPHICS', icon: '◇', enabled: true },
  { type: 'map', title: 'Satellite', category: 'PLANNED / DISABLED', icon: '▦', enabled: false },
  { type: 'map', title: 'Forecast', category: 'PLANNED / DISABLED', icon: '☁', enabled: false },
  { type: 'map', title: 'Alerts', category: 'PLANNED / DISABLED', icon: '!', enabled: false },
  { type: 'map', title: 'Models', category: 'PLANNED / DISABLED', icon: '∿', enabled: false },
  { type: 'map', title: 'SPC', category: 'PLANNED / DISABLED', icon: 'S', enabled: false },
  { type: 'map', title: 'Tropical', category: 'PLANNED / DISABLED', icon: 'T', enabled: false },
];

export function ContentBrowser({ onAdd }: { onAdd: (type: SceneObjectType) => void }) {
  const [tab, setTab] = useState<'content' | 'scenes' | 'data' | 'live'>('content');
  const [category, setCategory] = useState('ALL');
  return <section className="dock-panel content-browser">
    <div className="dock-title"><span>CONTENT LIBRARY</span><span className="dock-title-actions"><span className="dock-count">{products.length} items</span></span></div>
    <div className="dock-tabs">{(['content', 'scenes', 'data', 'live'] as const).map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'content' ? 'Content' : value === 'scenes' ? 'Scenes' : value === 'data' ? 'Data Sets' : 'Live'}</button>)}</div>
    {tab === 'content' && <><div className="browser-toolbar"><select value={category} onChange={event => setCategory(event.target.value)}><option>ALL</option><option>WEATHER</option><option>GRAPHICS</option><option>PLANNED / DISABLED</option></select><span>{products.filter(item => category === 'ALL' || item.category === category).length} products</span></div><div className="product-grid">{products.filter(item => category === 'ALL' || item.category === category).map(item => <button key={item.title} className={`product-tile ${!item.enabled ? 'disabled' : ''}`} disabled={!item.enabled} draggable={item.enabled} onDragStart={event => event.dataTransfer.setData('application/x-zasnet-object', item.type)} onClick={() => item.enabled && onAdd(item.type)}><span className={`product-thumb product-${item.type}`}>{item.icon}</span><strong>{item.title}</strong><small>{item.enabled ? item.category : 'PLANNED'}</small></button>)}</div></>}
    {tab === 'scenes' && <div className="browser-empty">Use the Scenes / Data dock below to manage saved scenes.</div>}
    {tab === 'data' && <div className="browser-empty"><strong>DATA SETS</strong><br />Data product browser foundation. Weather products will populate this workspace later.</div>}
    {tab === 'live' && <div className="browser-empty"><strong>LIVE LINEUPS</strong><br />Live lineup workflow is reserved for a later release.</div>}
  </section>;
}

export function SceneBrowser({ scenes, activeId, onSelect, onNew, onRename, onDuplicate, onDelete, onContextMenu }: { scenes: Scene[]; activeId: string; onSelect: (id: string) => void; onNew: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void; onContextMenu: (event: React.MouseEvent, scene: Scene) => void }) {
  const [tab, setTab] = useState<'scenes' | 'data' | 'live'>('scenes');
  return <section className="dock-panel scene-browser"><div className="dock-title"><span>SCENES / DATA / LIVE</span><button className="new-scene-button" onClick={onNew} title="New scene">＋</button></div><div className="dock-tabs">{(['scenes', 'data', 'live'] as const).map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'scenes' ? 'Scenes' : value === 'data' ? 'Data Sets' : 'Live'}</button>)}</div>{tab === 'scenes' ? <><div className="scene-grid">{scenes.map(scene => <button key={scene.id} className={`scene-card ${scene.id === activeId ? 'active' : ''}`} onClick={() => onSelect(scene.id)} onDoubleClick={() => onSelect(scene.id)} onContextMenu={event => onContextMenu(event, scene)}><SceneThumbnail scene={scene} /><span>{scene.name}</span><small>{scene.objects.length} layers · {scene.modifiedAt.slice(0, 10)}</small></button>)}</div><div className="scene-browser-actions"><button onClick={onRename}>Rename</button><button onClick={onDuplicate}>Duplicate</button><button onClick={onDelete}>Delete</button></div></> : <div className="browser-empty">{tab === 'data' ? 'Data Sets foundation' : 'Live Lineups foundation'}<small>Not enabled yet</small></div>}</section>;
}

export function CurrentToolPanel({ object, tool, radarStatus, radarRef, onPatch, onToolChange }: { object?: SceneObject; tool: 'select' | 'pan-canvas' | 'map-nav'; radarStatus?: RadarEditorStatus; radarRef: React.RefObject<RadarMapHandle | null>; onPatch: (patch: Partial<SceneObject> & { properties?: Record<string, unknown> }) => void; onToolChange: (tool: 'select' | 'pan-canvas' | 'map-nav') => void }) {
  const map = object?.type === 'map' ? object.properties as { center?: [number, number]; zoom?: number; bearing?: number; pitch?: number } : {};
  const center = map?.center || [-108.477, 43.066]; const prop = (key: string, value: unknown) => onPatch({ properties: { [key]: value } });
  return <section className="dock-panel current-tool"><div className="dock-title">CURRENT TOOL</div><div className="tool-choice"><button className={tool === 'select' ? 'active' : ''} onClick={() => onToolChange('select')}>↖ Select</button><button className={tool === 'pan-canvas' ? 'active' : ''} onClick={() => onToolChange('pan-canvas')}>✋ Canvas</button><button className={tool === 'map-nav' ? 'active' : ''} disabled={object?.type !== 'map'} onClick={() => onToolChange('map-nav')}>⌖ Map</button></div>{object?.type !== 'map' ? <div className="tool-empty">Select a Map object to edit its camera.</div> : <><div className="tool-section-title">CAMERA POSITION</div><div className="tool-number-grid"><label>Lon<input type="number" step=".001" value={center[0]} onChange={event => prop('center', [Number(event.target.value), center[1]])} /></label><label>Lat<input type="number" step=".001" value={center[1]} onChange={event => prop('center', [center[0], Number(event.target.value)])} /></label></div><div className="tool-section-title">ZOOM / ORIENTATION</div><label className="tool-slider">Zoom <input type="range" min="1" max="12" step=".1" value={map.zoom ?? 6} onChange={event => prop('zoom', Number(event.target.value))} /><output>{Number(map.zoom ?? 6).toFixed(1)}</output></label><div className="tool-number-grid"><label>Bearing<input type="number" value={Math.round(map.bearing ?? 0)} onChange={event => prop('bearing', Number(event.target.value))} /></label><label>Pitch<input type="number" value={Math.round(map.pitch ?? 0)} onChange={event => prop('pitch', Number(event.target.value))} /></label></div><div className="tool-actions"><button onClick={() => radarRef.current?.fitRadar()}>Fit Radar</button><button onClick={() => radarRef.current?.resetCamera()}>Home / North</button></div><MapViewPresets map={map} onPatch={onPatch} /><div className="tool-status">{radarStatus?.online ? `● LIVE · ${radarStatus.status.site}` : '○ RADAR OFFLINE'}</div></>}</section>;
}

export function StatusBar({ saved, radarStatus, diagnosticsVisible = false }: { saved: boolean; radarStatus?: RadarEditorStatus; diagnosticsVisible?: boolean }) { return <footer className="status-bar"><span>Backend <b className={radarStatus?.online ? 'status-ok' : 'status-warn'}>● {radarStatus?.online ? 'Connected' : 'Offline'}</b></span><span>Radar <b className={radarStatus?.online ? 'status-ok' : 'status-warn'}>● {radarStatus?.online ? 'LIVE' : 'OFFLINE'}</b></span><span>{radarStatus?.status.site || 'KRIW'}</span><span>{radarStatus?.frames || 0} frames</span>{diagnosticsVisible && <span>GPU renderer</span>}<span className="status-spacer" /><b className={saved ? 'status-ok' : 'status-warn'}>{saved ? 'Saved' : 'Modified'}</b></footer>; }
