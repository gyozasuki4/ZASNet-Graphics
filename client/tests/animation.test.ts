import { describe, expect, it } from 'vitest';
import { applyEntrancePreset, deleteKeyframe, evaluateKeyframes, evaluateScene, moveKeyframe, setKeyframe } from '../src/scenes/animation';
import { resolveDataText } from '../src/scenes/dataBindings';
import { duplicateScene } from '../src/scenes/sceneStore';
import { deserializeScenes, serializeScenes } from '../src/scenes/serialization';
import { createScene, createSceneObject, type Scene } from '../src/scenes/types';

describe('Step 5.9 scene animation foundation', () => {
  it('defaults scenes to a persisted 15 second / 30 fps animation timebase', () => {
    const loaded = deserializeScenes(serializeScenes([createScene()]))[0];
    expect(loaded).toMatchObject({ duration: 15, frameRate: 30, endBehavior: 'stop', radarPlayback: 'follow-global', animations: [] });
  });
  it('migrates static scenes without animation metadata', () => {
    const raw = JSON.stringify([{ ...createScene(), duration: undefined, frameRate: undefined, animations: undefined }]);
    expect(deserializeScenes(raw)[0]).toMatchObject({ duration: 15, frameRate: 30, animations: [] });
  });
  it('inserts, replaces, moves, and deletes keyframes deterministically', () => {
    let scene = createScene(); const text = scene.objects.find(object => object.type === 'text')!;
    scene = setKeyframe(scene, text, 'x', 0, 20); scene = setKeyframe(scene, text, 'x', 0, 30);
    const track = scene.animations[0]; expect(track.keyframes).toHaveLength(1); expect(track.keyframes[0].value).toBe(30);
    scene = moveKeyframe(scene, track.id, track.keyframes[0].id, 2); expect(scene.animations[0].keyframes[0].time).toBe(2);
    scene = deleteKeyframe(scene, track.id, track.keyframes[0].id); expect(scene.animations).toEqual([]);
  });
  it('evaluates hold, linear and easing interpolation', () => {
    const frames = [{ id: 'a', time: 0, value: 0, interpolation: 'linear' as const }, { id: 'b', time: 2, value: 100, interpolation: 'linear' as const }];
    expect(evaluateKeyframes(frames, 1, 0)).toBe(50);
    expect(evaluateKeyframes([{ ...frames[0], interpolation: 'hold' }, frames[1]], 1, 0)).toBe(0);
    expect(evaluateKeyframes([{ ...frames[0], interpolation: 'ease-in' }, frames[1]], 1, 0)).toBe(25);
  });
  it('evaluates position and opacity without mutating the saved object', () => {
    let scene = createScene(); const text = scene.objects.find(object => object.type === 'text')!;
    scene = setKeyframe(scene, text, 'x', 0, 0); scene = setKeyframe(scene, text, 'x', 2, 200); scene = setKeyframe(scene, text, 'opacity', 0, 0); scene = setKeyframe(scene, text, 'opacity', 2, 1);
    const result = evaluateScene(scene, 1).objects.find(object => object.id === text.id)!;
    expect(result.x).toBe(100); expect(result.opacity).toBe(.5); expect(scene.objects.find(object => object.id === text.id)?.x).toBe(64);
  });
  it('evaluates MapLibre camera values independently of map object transform', () => {
    let scene = createScene(); const map = scene.objects.find(object => object.type === 'map')!;
    scene = setKeyframe(scene, map, 'centerLon', 0, -110); scene = setKeyframe(scene, map, 'centerLon', 4, -108); scene = setKeyframe(scene, map, 'zoom', 0, 5); scene = setKeyframe(scene, map, 'zoom', 4, 8);
    const result = evaluateScene(scene, 2).objects.find(object => object.id === map.id)!;
    expect(result.x).toBe(0); expect(result.width).toBe(1920); expect(result.properties.center).toEqual([-109, 43.066]); expect(result.properties.zoom).toBe(6.5);
  });
  it('generates editable entrance and exit keyframes', () => {
    const scene = createScene(); const text = scene.objects.find(object => object.type === 'text')!;
    const entered = applyEntrancePreset(scene, text, 'left'); const exited = applyEntrancePreset(scene, text, 'fade', 14.5, .4, true);
    expect(entered.animations).toHaveLength(1); expect(entered.animations[0].keyframes).toHaveLength(2); expect(exited.animations[0].keyframes.at(-1)?.value).toBe(0);
  });
  it('resolves radar, scene, and clock templates from live context', () => {
    const text = resolveDataText('Radar: {{radar.site}} {{radar.product}} · {{radar.frame_count}} · {{scene.name}} · {{clock.utc}}', { radar: { site: 'KRIW', product: '94', frameCount: 13 }, scene: { name: 'Local Radar', duration: 15 }, now: new Date('2025-01-02T03:04:05Z') });
    expect(text).toContain('Radar: KRIW 94 · 13 · Local Radar · 03:04:05Z');
  });
  it('persists backgrounds, bindings, and animation tracks', () => {
    let scene: Scene = { ...createScene(), background: { type: 'gradient' as const, from: '#001122', to: '#112233' } }; const text = scene.objects.find(object => object.type === 'text')!;
    scene = { ...scene, objects: scene.objects.map(object => object.id === text.id ? { ...object, properties: { ...object.properties, text: '{{radar.scan_time}}' } } : object) }; scene = setKeyframe(scene, text, 'opacity', 1, .7);
    const loaded = deserializeScenes(serializeScenes([scene]))[0]; expect(loaded.background).toEqual(scene.background); expect(loaded.animations).toHaveLength(1); expect(loaded.objects.find(object => object.id === text.id)?.properties.text).toBe('{{radar.scan_time}}');
  });
  it('duplicates animated objects and scenes with independent ids', () => {
    let scene = createScene(); const text = scene.objects.find(object => object.type === 'text')!; scene = setKeyframe(scene, text, 'x', 1, 300);
    const copy = duplicateScene(scene); expect(copy.animations[0].objectId).not.toBe(text.id); expect(copy.animations[0].id).not.toBe(scene.animations[0].id);
    expect(createSceneObject('banner').properties.title).toBe('LIVE RADAR');
  });
});
