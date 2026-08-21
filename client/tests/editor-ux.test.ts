import { describe, expect, it } from 'vitest';
import { createScene, createSceneObject } from '../src/scenes/types';
import { deserializeScenes, serializeScenes } from '../src/scenes/serialization';
import { APP_PREFERENCES_STORAGE_KEY, DEFAULT_APP_PREFERENCES, loadPreferences, savePreferences } from '../src/scenes/preferences';
import { clampCanvasZoom, roundLogical } from '../src/editor/coordinates';
import { editorChromeVisible, isPreviewExitKey, isPreviewShortcut, mapCameraPatch, preserveMapCameraOnResize } from '../src/editor/interaction';

describe('Step 5.5 editor interaction', () => {
  it('supports an always-available preview exit and shortcut', () => {
    expect(isPreviewExitKey({ key: 'Escape' })).toBe(true);
    expect(isPreviewShortcut({ key: 'p', metaKey: true, ctrlKey: false, shiftKey: true })).toBe(true);
    expect(isPreviewShortcut({ key: 'p', metaKey: false, ctrlKey: true, shiftKey: true })).toBe(true);
    expect(editorChromeVisible('preview')).toBe(false);
    expect(editorChromeVisible('program')).toBe(false);
  });
  it('keeps camera state separate from scene object transform', () => {
    const camera = { center: [-108.2, 43.3] as [number, number], zoom: 7.2, bearing: 12, pitch: 4 };
    expect(mapCameraPatch(camera)).toEqual({ properties: camera });
    expect(preserveMapCameraOnResize(camera)).toEqual(camera);
    const object = createSceneObject('map');
    expect({ ...object, ...mapCameraPatch(camera) }).toMatchObject({ x: object.x, y: object.y, width: object.width, height: object.height });
  });
  it('persists camera values while rounding normal editor coordinates', () => {
    const scene = createScene(); const map = scene.objects.find(object => object.type === 'map')!;
    map.properties = { ...map.properties, center: [-108.2, 43.3], zoom: 7.2, bearing: 12, pitch: 4 };
    const loaded = deserializeScenes(serializeScenes([scene]))[0];
    expect(loaded.objects.find(object => object.type === 'map')?.properties).toMatchObject({ center: [-108.2, 43.3], zoom: 7.2, bearing: 12, pitch: 4 });
    expect(roundLogical(-429.6219)).toBe(-430);
    expect(clampCanvasZoom(9)).toBe(2.5);
  });
  it('stores application preferences independently of scene JSON', () => {
    const values = new Map<string, string>(); const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value) };
    savePreferences({ ...DEFAULT_APP_PREFERENCES, backendUrl: 'http://10.10.3.133:8080' }, storage);
    expect(loadPreferences(storage).backendUrl).toBe('http://10.10.3.133:8080');
    expect(values.has(APP_PREFERENCES_STORAGE_KEY)).toBe(true);
    expect(serializeScenes([createScene()])).not.toContain('backendUrl');
  });
});
