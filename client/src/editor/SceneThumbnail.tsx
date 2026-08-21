import type { Scene, SceneObject } from '../scenes/types';

export function thumbnailDescriptor(scene: Scene) {
  return { width: scene.width, height: scene.height, objectCount: scene.objects.length, hasMap: scene.objects.some(object => object.type === 'map'), title: scene.name };
}

export function SceneThumbnail({ scene }: { scene: Scene }) {
  const objects = [...scene.objects].filter(object => object.visible && object.type !== 'group').sort((a, b) => a.z - b.z).slice(0, 12);
  return <div className="scene-thumbnail" aria-label={`${scene.name} thumbnail`} style={{ background: scene.background }}>{objects.map(object => <ThumbnailObject key={object.id} object={object} scene={scene} />)}</div>;
}

function ThumbnailObject({ object, scene }: { object: SceneObject; scene: Scene }) {
  const style = { left: `${object.x / scene.width * 100}%`, top: `${object.y / scene.height * 100}%`, width: `${object.width / scene.width * 100}%`, height: `${object.height / scene.height * 100}%`, opacity: object.opacity };
  if (object.type === 'map') return <div className="thumbnail-map" style={style} />;
  if (object.type === 'shape') return <div className="thumbnail-shape" style={{ ...style, background: String(object.properties.fill || '#2b7083'), borderColor: String(object.properties.border || '#8dcbd4'), borderRadius: Number(object.properties.radius || 0) / 8 }} />;
  if (object.type === 'image' && object.properties.source) return <img className="thumbnail-image" style={style} src={String(object.properties.source)} alt="" />;
  if (object.type === 'text') return <div className="thumbnail-text" style={style}>{String(object.properties.text || 'Text').slice(0, 24)}</div>;
  return null;
}
