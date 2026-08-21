import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { CANVAS_HEIGHT, CANVAS_WIDTH, type MapObjectProperties, type Scene, type SceneMode, type SceneObject } from '../scenes/types';
import { clampCanvasZoom } from './coordinates';
import { RadarMapObject, type MapCamera, type RadarEditorStatus, type RadarMapHandle } from './RadarMapObject';
import type { RadarDiagnostics } from '../radar/renderer/RadarLayer';
import { resolveDataText, type BindingContext } from '../scenes/dataBindings';

export type EditorTool = 'select' | 'pan-canvas' | 'map-nav';
type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se';

interface Props {
  scene: Scene; selectedId?: string; mode: SceneMode; tool: EditorTool; canvasZoom: number;
  radarRef: React.RefObject<RadarMapHandle | null>; guides: boolean;
  onCanvasZoom: (zoom: number) => void; onToolChange: (tool: EditorTool) => void;
  onSelect: (id?: string) => void; onPatch: (id: string, patch: Partial<SceneObject>, record?: boolean) => void;
  onCameraChange: (id: string, camera: MapCamera) => void; onStatus: (status: RadarEditorStatus) => void;
  onDiagnostic: (diagnostics: RadarDiagnostics) => void; onDropObject: (type: SceneObject['type'], x: number, y: number) => void;
  onContextMenu: (event: React.MouseEvent, object?: SceneObject) => void;
  bindingContext?: BindingContext; cameraControlled?: boolean;
}

export function EditorCanvas({ scene, selectedId, mode, tool, canvasZoom, radarRef, guides, onCanvasZoom, onToolChange, onSelect, onPatch, onCameraChange, onStatus, onDiagnostic, onDropObject, onContextMenu, bindingContext, cameraControlled = false }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; width: number; height: number; startX: number; startY: number; resize?: ResizeDirection }>();
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<{ x: number; y: number; startX: number; startY: number }>();
  const [spaceHeld, setSpaceHeld] = useState(false);
  const scale = (stage.current?.getBoundingClientRect().width || CANVAS_WIDTH) / CANVAS_WIDTH;
  const clean = mode !== 'editor';

  useEffect(() => {
    const down = (event: KeyboardEvent) => event.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName) && setSpaceHeld(true);
    const up = (event: KeyboardEvent) => event.code === 'Space' && setSpaceHeld(false);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  function pointerDown(event: ReactPointerEvent, object: SceneObject, resize?: ResizeDirection) {
    if (clean) return;
    if (tool === 'map-nav' && object.type === 'map') { onSelect(object.id); return; }
    if (object.locked || tool === 'pan-canvas' || spaceHeld) return;
    event.stopPropagation(); onSelect(object.id);
    setDrag({ id: object.id, x: object.x, y: object.y, width: object.width, height: object.height, startX: event.clientX, startY: event.clientY, resize });
  }

  useEffect(() => {
    if (!drag) return;
    const active = drag; let recorded = false;
    const move = (event: PointerEvent) => {
      const dx = (event.clientX - active.startX) / scale, dy = (event.clientY - active.startY) / scale;
      if (!active.resize) onPatch(active.id, { x: active.x + dx, y: active.y + dy }, !recorded);
      else {
        let x = active.x, y = active.y, width = active.width, height = active.height;
        if (active.resize.includes('e')) width = active.width + dx; if (active.resize.includes('s')) height = active.height + dy;
        if (active.resize.includes('w')) { width = active.width - dx; x = active.x + dx; } if (active.resize.includes('n')) { height = active.height - dy; y = active.y + dy; }
        if (event.shiftKey) { const ratio = active.width / active.height; if (Math.abs(dx) > Math.abs(dy)) height = width / ratio; else width = height * ratio; }
        onPatch(active.id, { x, y, width: Math.max(24, width), height: Math.max(24, height) }, !recorded);
      }
      recorded = true;
    };
    const up = () => setDrag(undefined);
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [drag, scale, onPatch]);

  function beginPan(event: ReactPointerEvent) { if (clean || (tool !== 'pan-canvas' && !spaceHeld)) return; event.preventDefault(); event.stopPropagation(); setPanDrag({ x: pan.x, y: pan.y, startX: event.clientX, startY: event.clientY }); }
  useEffect(() => { if (!panDrag) return; const move = (event: PointerEvent) => setPan({ x: panDrag.x + event.clientX - panDrag.startX, y: panDrag.y + event.clientY - panDrag.startY }); const up = () => setPanDrag(undefined); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }; }, [panDrag]);
  function wheel(event: ReactWheelEvent) { if (clean || !(event.metaKey || event.ctrlKey)) return; event.preventDefault(); onCanvasZoom(clampCanvasZoom(canvasZoom + (event.deltaY > 0 ? -0.08 : 0.08))); }
  function drop(event: React.DragEvent) { event.preventDefault(); const type = event.dataTransfer.getData('application/x-zasnet-object') as SceneObject['type']; if (!type || !stage.current) return; const rect = stage.current.getBoundingClientRect(); onDropObject(type, (event.clientX - rect.left) / rect.width * scene.width, (event.clientY - rect.top) / rect.height * scene.height); }

  return <div className={`canvas-workspace ${clean ? 'clean-output' : ''} ${tool === 'map-nav' ? 'map-navigation-mode' : ''}`} onWheel={wheel} onDrop={drop} onDragOver={event => event.preventDefault()} onContextMenu={event => onContextMenu(event)} onPointerDown={event => { if (mode === 'editor' && (tool === 'pan-canvas' || spaceHeld)) beginPan(event); if (mode === 'editor' && !panDrag && tool === 'select' && event.target === event.currentTarget) onSelect(undefined); }}>
    {!clean && <><div className="canvas-ruler top">PREVIEWER · 1920 × 1080 · 16:9</div><div className="canvas-nav"><button onClick={() => { onCanvasZoom(1); setPan({ x: 0, y: 0 }); }}>FIT</button><button onClick={() => onCanvasZoom(clampCanvasZoom(canvasZoom - .1))}>−</button><span>{Math.round(canvasZoom * 100)}%</span><button onClick={() => onCanvasZoom(clampCanvasZoom(canvasZoom + .1))}>＋</button></div></>}
    <div className="canvas-stage-wrap" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${clean ? 1 : canvasZoom})` }}>
      <div ref={stage} className="scene-stage" style={{ aspectRatio: `${scene.width}/${scene.height}`, background: sceneBackground(scene) }} onDoubleClick={event => { const map = (event.target as HTMLElement).closest('.object-map'); const object = scene.objects.find(item => item.id === selectedId); if (map) { const mapObject = scene.objects.find(item => item.type === 'map' && (map as HTMLElement).contains(event.target as Node)); if (mapObject) onSelect(mapObject.id); if (mapObject || object?.type === 'map') onToolChange('map-nav'); } }} onContextMenu={event => onContextMenu(event)} onPointerDown={event => { event.stopPropagation(); if (event.target === event.currentTarget && mode === 'editor') { if (tool === 'map-nav') onToolChange('select'); else onSelect(undefined); } }}>
        {guides && !clean && <div className="safe-guides"><span className="title-safe">TITLE SAFE</span><span className="action-safe">ACTION SAFE</span><i /></div>}
        {[...scene.objects].sort((a, b) => a.z - b.z).map(object => object.visible && <div key={object.id} className={`scene-object object-${object.type} object-role-${object.role} ${selectedId === object.id ? 'selected-object' : ''}`} style={{ left: `${object.x / scene.width * 100}%`, top: `${object.y / scene.height * 100}%`, width: `${object.width / scene.width * 100}%`, height: `${object.height / scene.height * 100}%`, opacity: object.opacity, transform: `rotate(${object.rotation}deg) scale(${object.scaleX}, ${object.scaleY})`, zIndex: object.z }} onPointerDown={event => pointerDown(event, object)} onContextMenu={event => onContextMenu(event, object)}>
          {object.type === 'map' && <><RadarMapObject ref={radarRef} config={object.properties as unknown as MapObjectProperties} navigation={tool === 'map-nav' && selectedId === object.id} cameraControlled={cameraControlled} onCameraChange={camera => onCameraChange(object.id, camera)} onStatus={onStatus} onDiagnostic={onDiagnostic} />{tool === 'map-nav' && selectedId === object.id && <div className="map-nav-banner">MAP NAVIGATION · drag to pan · wheel to zoom · Esc to exit</div>}</>}
          {object.type === 'text' && <div className="scene-text" style={{ color: String(object.properties.color), fontFamily: String(object.properties.fontFamily), fontSize: `${Number(object.properties.fontSize) * (100 / 1920)}vw`, fontWeight: Number(object.properties.fontWeight), fontStyle: object.properties.italic ? 'italic' : 'normal', textAlign: object.properties.align as 'left' | 'center' | 'right', WebkitTextStroke: `${Number(object.properties.outlineWidth || 0) * (100 / 1920)}vw ${String(object.properties.outline || '#000')}`, textShadow: object.properties.shadow ? '2px 2px 4px #000b' : undefined }}>{resolveDataText(String(object.properties.text), bindingContext || { scene: { name: scene.name, duration: scene.duration } })}</div>}
          {object.type === 'shape' && <div className={`scene-shape variant-${String(object.properties.variant || 'rectangle')}`} style={{ background: String(object.properties.fill), border: `${Number(object.properties.borderWidth)}px solid ${String(object.properties.border)}`, borderRadius: String(object.properties.variant) === 'ellipse' ? '50%' : `${Number(object.properties.radius)}px` }} />}
          {object.type === 'image' && <div className="scene-image">{object.properties.source ? <img src={String(object.properties.source)} alt={object.name} /> : 'IMAGE'}</div>}
          {object.type === 'banner' && <div className="scene-banner" style={{ background: object.properties.source ? `url(${String(object.properties.source)}) center / ${String(object.properties.fit || 'contain')} no-repeat` : String(object.properties.fill), borderLeftColor: String(object.properties.accent) }}><strong>{resolveDataText(String(object.properties.title), bindingContext || { scene: { name: scene.name, duration: scene.duration } })}</strong><small>{resolveDataText(String(object.properties.subtitle), bindingContext || { scene: { name: scene.name, duration: scene.duration } })}</small></div>}
          {selectedId === object.id && mode === 'editor' && tool === 'select' && !object.locked && <>{(['nw', 'ne', 'sw', 'se'] as const).map(direction => <span key={direction} className={`selection-handle handle-${direction}`} onPointerDown={event => { event.stopPropagation(); pointerDown(event, object, direction); }} />)}</>}
        </div>)}
      </div>
    </div>
  </div>;
}

function sceneBackground(scene: Scene) { const background = scene.background; if (typeof background === 'string') return background; if (background.type === 'transparent') return 'transparent'; if (background.type === 'gradient') return `linear-gradient(${background.angle ?? 135}deg, ${background.from || '#142027'}, ${background.to || '#09151d'})`; if (background.type === 'image' && background.source) return `url(${background.source}) center / cover`; return background.color || '#142027'; }
