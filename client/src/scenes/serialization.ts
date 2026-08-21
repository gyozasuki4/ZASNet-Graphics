import { createScene, type Scene } from './types';
export const SCENE_STORAGE_KEY = 'zasnet.scenes.v1';
export function serializeScenes(scenes: Scene[]) { return JSON.stringify(scenes); }
export function deserializeScenes(raw: string | null): Scene[] { if (!raw) return [createScene()]; try { const parsed = JSON.parse(raw) as Scene[]; return Array.isArray(parsed) && parsed.length ? parsed : [createScene()]; } catch { return [createScene()]; } }
export function loadScenes(storage: Pick<Storage, 'getItem'> = localStorage) { return deserializeScenes(storage.getItem(SCENE_STORAGE_KEY)); }
export function saveScenes(scenes: Scene[], storage: Pick<Storage, 'setItem'> = localStorage) { storage.setItem(SCENE_STORAGE_KEY, serializeScenes(scenes)); }
