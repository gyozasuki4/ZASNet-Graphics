import { createScene, createSceneObject, type Scene, type SceneObject } from './types';
export const SCENE_STORAGE_KEY = 'zasnet.scenes.v1';
export function serializeScenes(scenes: Scene[]) { return JSON.stringify(scenes); }
function hydrateObject(value: SceneObject): SceneObject {
  const defaults = createSceneObject(value.type);
  return { ...defaults, ...value, properties: { ...defaults.properties, ...(value.properties || {}) } };
}
function hydrateScene(value: Scene): Scene {
  const now = new Date().toISOString();
  const objects = Array.isArray(value.objects) ? value.objects.map(hydrateObject) : [];
  const primaryMap = objects.find(object => object.type === 'map' && (value.name === 'Local Radar' || value.metadata?.product === 'radar'));
  const migratedObjects = primaryMap ? objects.map(object => object.id === primaryMap.id ? { ...object, role: 'background' as const, locked: true, z: 0 } : object) : objects;
  return { ...createScene(value.name || 'Scene'), ...value, aspectRatio: value.aspectRatio || '16:9', objects: migratedObjects, metadata: value.metadata || {}, createdAt: value.createdAt || now, modifiedAt: value.modifiedAt || now };
}
export function deserializeScenes(raw: string | null): Scene[] { if (!raw) return [createScene()]; try { const parsed = JSON.parse(raw) as Scene[]; return Array.isArray(parsed) && parsed.length ? parsed.map(hydrateScene) : [createScene()]; } catch { return [createScene()]; } }
export function loadScenes(storage: Pick<Storage, 'getItem'> = localStorage) { return deserializeScenes(storage.getItem(SCENE_STORAGE_KEY)); }
export function saveScenes(scenes: Scene[], storage: Pick<Storage, 'setItem'> = localStorage) { storage.setItem(SCENE_STORAGE_KEY, serializeScenes(scenes)); }
