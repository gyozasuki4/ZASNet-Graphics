export type SceneObjectType = 'text' | 'image' | 'shape' | 'map' | 'group';
export type SceneMode = 'editor' | 'preview' | 'program';
export interface MapObjectProperties {
  center: [number, number]; zoom: number; bearing: number; pitch: number;
  states: boolean; counties: boolean; roads: boolean; labels: boolean;
  radar: boolean; palette: string; opacity: number;
  site: string; product: string; loopMinutes: number; playbackSpeed: number; endDwell: number;
}
export interface TextObjectProperties { text: string; fontFamily: string; fontSize: number; fontWeight: number; italic: boolean; align: 'left' | 'center' | 'right'; color: string; outline: string; outlineWidth: number; shadow: boolean; }
export interface ShapeObjectProperties { fill: string; border: string; borderWidth: number; radius: number; }
export interface ImageObjectProperties { source: string; fit: 'contain' | 'cover' | 'fill'; }
export interface SceneObject { id: string; type: SceneObjectType; name: string; x: number; y: number; width: number; height: number; rotation: number; opacity: number; visible: boolean; locked: boolean; z: number; properties: Record<string, unknown>; }
export interface Scene { id: string; name: string; width: number; height: number; aspectRatio: string; background: string; objects: SceneObject[]; metadata: Record<string, unknown>; createdAt: string; modifiedAt: string; }
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export function createScene(name = 'Local Radar'): Scene { const now = new Date().toISOString(); return { id: newId('scene'), name, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, aspectRatio: '16:9', background: '#142027', objects: [createSceneObject('map', 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 'Radar Map'), createSceneObject('text', 64, 52, 720, 90, 'Title', { text: 'ZASNet Weather', fontSize: 44, fontWeight: 700, color: '#f3f7f8' })], metadata: { product: 'radar', site: 'KRIW' }, createdAt: now, modifiedAt: now }; }
export function createSceneObject(type: SceneObjectType, x = 120, y = 120, width = 480, height = 240, name?: string, overrides: Record<string, unknown> = {}): SceneObject { const defaults: Record<SceneObjectType, Record<string, unknown>> = { text: { text: 'New text', fontFamily: 'Inter, sans-serif', fontSize: 42, fontWeight: 600, italic: false, align: 'left', color: '#ffffff', outline: '#000000', outlineWidth: 0, shadow: false }, image: { source: '', fit: 'contain' }, shape: { variant: 'rectangle', fill: '#26708a', border: '#8cc8d8', borderWidth: 2, radius: 8 }, map: { center: [-108.477, 43.066], zoom: 6, bearing: 0, pitch: 0, states: true, counties: true, roads: true, labels: true, radar: true, palette: 'ZASNet Broadcast', opacity: 0.85, site: 'KRIW', product: '94', loopMinutes: 30, playbackSpeed: 1, endDwell: 0 }, group: { children: [] } }; return { id: newId('object'), type, name: name || `${type[0].toUpperCase()}${type.slice(1)}`, x, y, width, height, rotation: 0, opacity: 1, visible: true, locked: false, z: Date.now(), properties: { ...defaults[type], ...overrides } }; }
