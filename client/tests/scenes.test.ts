import { describe, expect, it } from 'vitest';
import { createScene, createSceneObject } from '../src/scenes/types';
import { addObject, duplicateScene, removeObject, reorderObject, updateObject } from '../src/scenes/sceneStore';
import { deserializeScenes, serializeScenes } from '../src/scenes/serialization';
import { History } from '../src/scenes/history';

describe('scene editor model', () => {
  it('creates and round-trips a 16:9 scene', () => { const scene = createScene(); expect(scene.width).toBe(1920); expect(scene.height).toBe(1080); expect(scene.aspectRatio).toBe('16:9'); expect(deserializeScenes(serializeScenes([scene]))[0]).toEqual(scene); });
  it('duplicates scenes with independent object ids', () => { const scene = createScene(); const copy = duplicateScene(scene); expect(copy.id).not.toBe(scene.id); expect(copy.objects[0].id).not.toBe(scene.objects[0].id); expect(copy.name).toContain('Copy'); });
  it('adds, updates, removes, and orders objects', () => { let scene = createScene(); scene = addObject(scene, 'shape'); const object = scene.objects.at(-1)!; scene = updateObject(scene, object.id, { x: 300, properties: { fill: '#ff00ff' } }); expect(scene.objects.find(item => item.id === object.id)?.x).toBe(300); expect(scene.objects.find(item => item.id === object.id)?.properties.fill).toBe('#ff00ff'); scene = reorderObject(scene, object.id, -1); expect(scene.objects.find(item => item.id === object.id)?.z).toBeLessThan(2); scene = removeObject(scene, object.id); expect(scene.objects.some(item => item.id === object.id)).toBe(false); });
  it('supports undo and redo snapshots', () => { const history = new History<number>(); history.push(1); expect(history.undo(2)).toBe(1); expect(history.redo(1)).toBe(2); });
  it('creates extensible object types', () => { expect(createSceneObject('text').properties.text).toBe('New text'); expect(createSceneObject('map').properties.zoom).toBe(6); });
});
