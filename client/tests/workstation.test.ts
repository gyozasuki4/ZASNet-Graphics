import { describe, expect, it } from 'vitest';
import { displayToLogical, logicalToDisplay } from '../src/editor/coordinates';
import { thumbnailDescriptor } from '../src/editor/SceneThumbnail';
import { addObject, createInsertedObject, fitObjectToFrame, groupObjects, reorderObject, setObjectAsBackground, updateObject, updateObjectRespectingLock } from '../src/scenes/sceneStore';
import { deserializeScenes, serializeScenes } from '../src/scenes/serialization';
import { createScene, createSceneObject, type Scene } from '../src/scenes/types';
import { mapStyleForPreset, mapStylePresets } from '../src/map/styles';

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

  it('creates a full-frame locked primary radar map', () => {
    const scene = createScene();
    const map = scene.objects.find(object => object.type === 'map')!;
    expect(map).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080, rotation: 0, locked: true, role: 'background', z: 0 });
    expect(map.properties).toMatchObject({ center: [-108.477, 43.066], stylePreset: 'broadcast-gray' });
  });

  it('inserts a full-frame map only when the scene has no map/background', () => {
    const empty = emptyScene();
    const primary = createInsertedObject(empty, 'map');
    expect(primary).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080, locked: true, role: 'background' });
    const existing = { ...empty, objects: [createSceneObject('map')] };
    const secondary = createInsertedObject(existing, 'map');
    expect(secondary).toMatchObject({ x: 120, y: 120, width: 480, height: 240, locked: false });
  });

  it('inserts the supplied header banner in a title-safe broadcast position', () => {
    const scene: Scene = { ...createScene(), objects: [] };
    const banner = createInsertedObject(scene, 'banner');
    expect(banner).toMatchObject({ type: 'banner', x: 250, y: 40, width: 1420, height: 180, role: 'graphics' });
    expect(banner.properties.source).toBe('/assets/zasnet-main-banner.png');
  });

  it('persists named map camera views with the scene', () => {
    const scene = createScene();
    const map = scene.objects.find(object => object.type === 'map')!;
    const savedViews = [{ name: 'Wyoming Overview', center: [-108.477, 43.066] as [number, number], zoom: 6, bearing: 0, pitch: 0 }];
    const next = updateObject(scene, map.id, { properties: { savedViews } });
    const loaded = deserializeScenes(serializeScenes([next]))[0];
    expect((loaded.objects.find(object => object.id === map.id)?.properties.savedViews as typeof savedViews)[0].name).toBe('Wyoming Overview');
  });

  it('protects locked transforms while allowing camera/style properties', () => {
    const scene = createScene(); const map = scene.objects.find(object => object.type === 'map')!;
    const moved = updateObjectRespectingLock(scene, map.id, { x: 200, y: 200, width: 400, height: 300, rotation: 12, properties: { zoom: 8, stylePreset: 'classic' } });
    const result = moved.objects.find(object => object.id === map.id)!;
    expect(result).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080, rotation: 0, locked: true });
    expect(result.properties).toMatchObject({ zoom: 8, stylePreset: 'classic' });
    const unlocked = updateObjectRespectingLock({ ...scene, objects: scene.objects.map(object => object.id === map.id ? { ...object, locked: false } : object) }, map.id, { x: 200 });
    expect(unlocked.objects.find(object => object.id === map.id)?.x).toBe(200);
  });

  it('supports full-frame and background actions without changing map camera', () => {
    let scene = createScene(); const map = scene.objects.find(object => object.type === 'map')!;
    scene = updateObject(scene, map.id, { x: 300, y: 200, width: 800, height: 600, locked: false, properties: { center: [-110, 44], zoom: 7 } });
    scene = fitObjectToFrame(scene, map.id);
    expect(scene.objects.find(object => object.id === map.id)).toMatchObject({ x: 0, y: 0, width: 1920, height: 1080, rotation: 0, locked: false });
    expect(scene.objects.find(object => object.id === map.id)?.properties).toMatchObject({ center: [-110, 44], zoom: 7 });
    scene = setObjectAsBackground(scene, map.id);
    expect(scene.objects.find(object => object.id === map.id)).toMatchObject({ role: 'background', locked: true });
  });

  it('exposes named map style presets for presentation settings', () => {
    expect(mapStylePresets.map(preset => preset.id)).toEqual(['broadcast-gray', 'classic', 'broadcast-satellite']);
    expect(mapStyleForPreset('classic')).toBe(mapStylePresets[1].style);
    expect(mapStyleForPreset('missing')).toBe(mapStylePresets[0].style);
  });

  it('migrates a saved legacy Local Radar map to the locked background convention', () => {
    const scene = createScene();
    const legacy = JSON.parse(serializeScenes([scene])) as Scene[];
    const loaded = deserializeScenes(JSON.stringify([{ ...legacy[0], objects: legacy[0].objects.map(object => ({ ...object, role: undefined, locked: false })) }]))[0];
    expect(loaded.objects.find(object => object.type === 'map')).toMatchObject({ role: 'background', locked: true, z: 0 });
  });
});
