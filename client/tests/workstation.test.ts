import { describe, expect, it } from 'vitest';
import { displayToLogical, logicalToDisplay } from '../src/editor/coordinates';
import { thumbnailDescriptor } from '../src/editor/SceneThumbnail';
import { addObject, groupObjects, reorderObject, updateObject } from '../src/scenes/sceneStore';
import { deserializeScenes, serializeScenes } from '../src/scenes/serialization';
import { createScene, createSceneObject, type Scene } from '../src/scenes/types';

function emptyScene(): Scene { return { ...createScene(), objects: [] }; }

describe('Step 5.75 workstation model', () => {
  it('describes scene thumbnails without changing scene content', () => {
    const scene = createScene('Forecast Board');
    const descriptor = thumbnailDescriptor(scene);
    expect(descriptor).toMatchObject({ width: 1920, height: 1080, hasMap: true, title: 'Forecast Board' });
    expect(descriptor.objectCount).toBe(scene.objects.length);
  });

  it('supports non-map broadcast scenes through save and load', () => {
    let scene: Scene = { ...createScene('Lower Third'), objects: [], background: '#09131b' };
    scene = addObject(scene, 'shape');
    scene = addObject(scene, 'text');
    const loaded = deserializeScenes(serializeScenes([scene]))[0];
    expect(loaded.objects.map(object => object.type)).toEqual(['shape', 'text']);
    expect(loaded.background).toBe('#09131b');
  });

  it('creates a group container while preserving child objects', () => {
    let scene: Scene = { ...createScene(), objects: [createSceneObject('text', 100, 120), createSceneObject('shape', 220, 180)] };
    const ids = scene.objects.map(object => object.id);
    scene = groupObjects(scene, ids);
    const group = scene.objects.find(object => object.type === 'group');
    expect(group?.properties.children).toEqual(ids);
    expect(scene.objects.filter(object => ids.includes(object.id))).toHaveLength(2);
  });

  it('supports text and shape authoring properties', () => {
    let scene: Scene = emptyScene();
    scene = addObject(scene, 'text');
    const text = scene.objects[0];
    scene = updateObject(scene, text.id, { properties: { text: 'WARNINGS', italic: true, outlineWidth: 3, shadow: true } });
    expect(scene.objects[0].properties).toMatchObject({ text: 'WARNINGS', italic: true, outlineWidth: 3, shadow: true });
    scene = addObject(scene, 'shape');
    const shape = scene.objects[1];
    scene = updateObject(scene, shape.id, { properties: { variant: 'ellipse', fill: '#d3315b', borderWidth: 4 } });
    expect(scene.objects[1].properties).toMatchObject({ variant: 'ellipse', fill: '#d3315b', borderWidth: 4 });
  });

  it('keeps image source metadata local to the scene object', () => {
    let scene: Scene = emptyScene();
    scene = addObject(scene, 'image');
    const source = 'data:image/png;base64,ZmFrZQ==';
    scene = updateObject(scene, scene.objects[0].id, { properties: { source, fit: 'contain' } });
    const loaded = deserializeScenes(serializeScenes([scene]))[0];
    expect(loaded.objects[0].properties).toMatchObject({ source, fit: 'contain' });
  });

  it('reorders layers without changing their logical geometry', () => {
    let scene: Scene = emptyScene();
    scene = addObject(scene, 'text');
    scene = addObject(scene, 'shape');
    const shape = scene.objects[1];
    const before = { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    scene = reorderObject(scene, shape.id, -1);
    const after = scene.objects.find(object => object.id === shape.id)!;
    expect({ x: after.x, y: after.y, width: after.width, height: after.height }).toEqual(before);
    expect(after.z).toBe(0);
  });

  it('keeps editor viewport scaling separate from 1920x1080 scene coordinates', () => {
    expect(logicalToDisplay(960, 960)).toBe(480);
    expect(displayToLogical(480, 960)).toBe(960);
    expect(logicalToDisplay(100, 1440)).toBe(75);
  });
});
