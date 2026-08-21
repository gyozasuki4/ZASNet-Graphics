export type SceneObjectType = 'text' | 'image' | 'shape' | 'map' | 'group' | 'banner';
export type SceneObjectRole = 'background' | 'weather' | 'graphics' | 'foreground';
export type SceneMode = 'editor' | 'preview' | 'program';
export type KeyframeInterpolation = 'hold' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type AnimationProperty = 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'scaleX' | 'scaleY' | 'centerLon' | 'centerLat' | 'zoom' | 'bearing' | 'pitch';
export type SceneEndBehavior = 'stop' | 'loop';
export type RadarPlaybackDuringScene = 'follow-global' | 'play' | 'pause';
export interface Keyframe { id: string; time: number; value: number; interpolation: KeyframeInterpolation; }
export interface AnimationTrack { id: string; objectId: string; property: AnimationProperty; keyframes: Keyframe[]; }
export interface SceneBackground { type: 'transparent' | 'solid' | 'gradient' | 'image'; color?: string; from?: string; to?: string; angle?: number; source?: string; }
export interface MapObjectProperties {
  center: [number, number]; zoom: number; bearing: number; pitch: number;
  states: boolean; counties: boolean; roads: boolean; labels: boolean;
  radar: boolean; palette: string; opacity: number;
  site: string; product: string; loopMinutes: number; playbackSpeed: number; endDwell: number;
  stylePreset: string; renderMode?: 'Raw' | 'Smooth' | 'Broadcast';
  savedViews?: Array<{ name: string; center: [number, number]; zoom: number; bearing: number; pitch: number }>;
  layerStyles?: Partial<Record<'states' | 'counties' | 'roads' | 'labels', { color: string; width: number; opacity: number; textSize?: number; haloColor?: string }>>;
  highlightCounty?: string; highlightCountyColor?: string; highlightCountyOpacity?: number;
}
export interface TextObjectProperties { text: string; fontFamily: string; fontSize: number; fontWeight: number; italic: boolean; align: 'left' | 'center' | 'right'; color: string; outline: string; outlineWidth: number; shadow: boolean; }
export interface ShapeObjectProperties { fill: string; border: string; borderWidth: number; radius: number; }
export interface ImageObjectProperties { source: string; fit: 'contain' | 'cover' | 'fill'; }
export interface SceneObject { id: string; type: SceneObjectType; role: SceneObjectRole; name: string; x: number; y: number; width: number; height: number; rotation: number; opacity: number; scaleX: number; scaleY: number; visible: boolean; locked: boolean; z: number; properties: Record<string, unknown>; }
export interface Scene { id: string; name: string; width: number; height: number; aspectRatio: string; background: SceneBackground | string; duration: number; frameRate: number; endBehavior: SceneEndBehavior; radarPlayback: RadarPlaybackDuringScene; animations: AnimationTrack[]; objects: SceneObject[]; metadata: Record<string, unknown>; createdAt: string; modifiedAt: string; }
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export function createScene(name = 'Local Radar'): Scene { const now = new Date().toISOString(); const map = { ...createSceneObject('map', 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 'Radar Map'), role: 'background' as const, locked: true, z: 0 }; const title = { ...createSceneObject('text', 64, 52, 720, 90, 'Title', { text: 'ZASNet Weather', fontSize: 44, fontWeight: 700, color: '#f3f7f8' }), role: 'graphics' as const, z: 1 }; return { id: newId('scene'), name, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, aspectRatio: '16:9', background: { type: 'solid', color: '#142027' }, duration: 15, frameRate: 30, endBehavior: 'stop', radarPlayback: 'follow-global', animations: [], objects: [map, title], metadata: { product: 'radar', site: 'KRIW' }, createdAt: now, modifiedAt: now }; }
export function createSceneObject(type: SceneObjectType, x = 120, y = 120, width = 480, height = 240, name?: string, overrides: Record<string, unknown> = {}): SceneObject { const defaults: Record<SceneObjectType, Record<string, unknown>> = { text: { text: 'New text', fontFamily: 'Inter, sans-serif', fontSize: 42, fontWeight: 600, italic: false, align: 'left', color: '#ffffff', outline: '#000000', outlineWidth: 0, shadow: false }, image: { source: '', fit: 'contain' }, shape: { variant: 'rectangle', fill: '#26708a', border: '#8cc8d8', borderWidth: 2, radius: 8 }, map: { center: [-108.477, 43.066], zoom: 6, bearing: 0, pitch: 0, states: true, counties: true, roads: true, labels: true, radar: true, palette: 'ZASNet Broadcast', opacity: 0.85, site: 'KRIW', product: '94', loopMinutes: 30, playbackSpeed: 1, endDwell: 0, stylePreset: 'broadcast-gray', renderMode: 'Broadcast', layerStyles: { states: { color: '#dcecf0', width: 2.5, opacity: .9 }, counties: { color: '#9bb5bd', width: 1, opacity: .55 }, roads: { color: '#d39b61', width: 1.4, opacity: .6 }, labels: { color: '#f2f7f8', width: 0, opacity: .95, textSize: 12, haloColor: '#132027' } } }, group: { children: [] }, banner: { title: 'LIVE RADAR', subtitle: 'CENTRAL WYOMING', fill: '#092a40', accent: '#27b5d9', logoSource: '', source: '/assets/zasnet-main-banner.png', fit: 'contain' } }; return { id: newId('object'), type, role: 'foreground', name: name || `${type[0].toUpperCase()}${type.slice(1)}`, x, y, width, height, rotation: 0, opacity: 1, scaleX: 1, scaleY: 1, visible: true, locked: false, z: Date.now(), properties: { ...defaults[type], ...overrides } }; }
