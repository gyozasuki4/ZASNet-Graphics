import { newId, type AnimationProperty, type AnimationTrack, type Keyframe, type KeyframeInterpolation, type Scene, type SceneObject } from './types';

const ease = (value: number, interpolation: KeyframeInterpolation) => interpolation === 'hold' ? 0 : interpolation === 'ease-in' ? value * value : interpolation === 'ease-out' ? 1 - (1 - value) ** 2 : interpolation === 'ease-in-out' ? (value < .5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2) : value;
export const clampSceneTime = (scene: Pick<Scene, 'duration'>, time: number) => Math.max(0, Math.min(scene.duration, time));
export function evaluateKeyframes(keyframes: Keyframe[], time: number, fallback: number) {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (!sorted.length) return fallback;
  if (time <= sorted[0].time) return sorted[0].value;
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;
  const rightIndex = sorted.findIndex(keyframe => keyframe.time >= time);
  const left = sorted[rightIndex - 1]; const right = sorted[rightIndex];
  const progress = (time - left.time) / Math.max(.00001, right.time - left.time);
  return left.value + (right.value - left.value) * ease(progress, left.interpolation);
}
export function evaluateScene(scene: Scene, time: number): Scene {
  const byObject = new Map<string, AnimationTrack[]>();
  scene.animations.forEach(track => byObject.set(track.objectId, [...(byObject.get(track.objectId) || []), track]));
  const evaluated = scene.objects.map(object => evaluateObject(object, byObject.get(object.id) || [], time));
  const byId = new Map(evaluated.map(object => [object.id, object]));
  for (const group of evaluated.filter(object => object.type === 'group')) { const base = scene.objects.find(object => object.id === group.id); if (!base) continue; const dx = group.x - base.x, dy = group.y - base.y; for (const childId of (group.properties.children as string[] | undefined) || []) { const child = byId.get(childId); if (child) { child.x += dx; child.y += dy; } } }
  return { ...scene, objects: evaluated };
}
export function evaluateObject(object: SceneObject, tracks: AnimationTrack[], time: number): SceneObject {
  let next = { ...object, properties: { ...object.properties } };
  for (const track of tracks) {
    const current = propertyValue(next, track.property);
    const value = evaluateKeyframes(track.keyframes, time, current);
    next = applyAnimatedValue(next, track.property, value);
  }
  return next;
}
export function propertyValue(object: SceneObject, property: AnimationProperty) {
  if (property === 'centerLon') return Number((object.properties.center as [number, number] | undefined)?.[0] ?? -108.477);
  if (property === 'centerLat') return Number((object.properties.center as [number, number] | undefined)?.[1] ?? 43.066);
  if (property === 'zoom' || property === 'bearing' || property === 'pitch') return Number(object.properties[property] ?? 0);
  return Number(object[property] ?? 0);
}
export function applyAnimatedValue(object: SceneObject, property: AnimationProperty, value: number): SceneObject {
  if (property === 'centerLon' || property === 'centerLat') {
    const center = [...((object.properties.center as [number, number] | undefined) || [-108.477, 43.066])] as [number, number];
    center[property === 'centerLon' ? 0 : 1] = value;
    return { ...object, properties: { ...object.properties, center } };
  }
  if (property === 'zoom' || property === 'bearing' || property === 'pitch') return { ...object, properties: { ...object.properties, [property]: value } };
  return { ...object, [property]: value };
}
export function setKeyframe(scene: Scene, object: SceneObject, property: AnimationProperty, time: number, value = propertyValue(object, property), interpolation: KeyframeInterpolation = 'linear'): Scene {
  const existing = scene.animations.find(track => track.objectId === object.id && track.property === property);
  const keyframe: Keyframe = { id: newId('key'), time: Math.round(time * 1000) / 1000, value, interpolation };
  const update = (track: AnimationTrack): AnimationTrack => ({ ...track, keyframes: [...track.keyframes.filter(item => Math.abs(item.time - keyframe.time) > .0005), keyframe].sort((a, b) => a.time - b.time) });
  return { ...scene, animations: existing ? scene.animations.map(track => track.id === existing.id ? update(track) : track) : [...scene.animations, { id: newId('track'), objectId: object.id, property, keyframes: [keyframe] }], modifiedAt: new Date().toISOString() };
}
export function deleteKeyframe(scene: Scene, trackId: string, keyframeId: string): Scene {
  return { ...scene, animations: scene.animations.map(track => track.id === trackId ? { ...track, keyframes: track.keyframes.filter(keyframe => keyframe.id !== keyframeId) } : track).filter(track => track.keyframes.length), modifiedAt: new Date().toISOString() };
}
export function moveKeyframe(scene: Scene, trackId: string, keyframeId: string, time: number): Scene {
  return { ...scene, animations: scene.animations.map(track => track.id !== trackId ? track : { ...track, keyframes: track.keyframes.map(keyframe => keyframe.id === keyframeId ? { ...keyframe, time: Math.round(Math.max(0, Math.min(scene.duration, time)) * 1000) / 1000 } : keyframe).sort((a, b) => a.time - b.time) }), modifiedAt: new Date().toISOString() };
}
export function hasKeyframe(scene: Scene, objectId: string, property: AnimationProperty, time: number) { return Boolean(scene.animations.find(track => track.objectId === objectId && track.property === property)?.keyframes.some(keyframe => Math.abs(keyframe.time - time) < .0005)); }
export function duplicateTracks(scene: Scene, sourceId: string, targetId: string) { return scene.animations.flatMap(track => track.objectId === sourceId ? [{ ...track, id: newId('track'), objectId: targetId, keyframes: track.keyframes.map(keyframe => ({ ...keyframe, id: newId('key') })) }] : []); }
export function applyEntrancePreset(scene: Scene, object: SceneObject, preset: 'fade' | 'left' | 'right' | 'up' | 'down' | 'scale', start = 0, duration = .4, exit = false): Scene {
  const end = Math.min(scene.duration, start + duration); const base = object;
  const changes: Array<[AnimationProperty, number, number]> = preset === 'fade' ? [['opacity', exit ? base.opacity : 0, exit ? 0 : base.opacity]] : preset === 'scale' ? [['scaleX', exit ? base.scaleX : .82, exit ? .82 : base.scaleX], ['scaleY', exit ? base.scaleY : .82, exit ? .82 : base.scaleY]] : preset === 'left' ? [['x', exit ? base.x : base.x - base.width, exit ? base.x - base.width : base.x]] : preset === 'right' ? [['x', exit ? base.x : base.x + base.width, exit ? base.x + base.width : base.x]] : preset === 'up' ? [['y', exit ? base.y : base.y - base.height, exit ? base.y - base.height : base.y]] : [['y', exit ? base.y : base.y + base.height, exit ? base.y + base.height : base.y]];
  return changes.reduce((next, [property, from, to]) => setKeyframe(setKeyframe(next, applyAnimatedValue(base, property, from), property, start, from), applyAnimatedValue(base, property, to), property, end, to, 'ease-out'), scene);
}
