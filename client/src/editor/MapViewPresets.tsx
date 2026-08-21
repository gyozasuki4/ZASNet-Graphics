import type { MapObjectProperties, SceneObject } from '../scenes/types';

type Props = { map: Partial<MapObjectProperties>; onPatch: (patch: Partial<SceneObject> & { properties?: Record<string, unknown> }) => void };

export function MapViewPresets({ map, onPatch }: Props) {
  const views = map.savedViews || [];
  const camera = { center: map.center || [-108.477, 43.066] as [number, number], zoom: Number(map.zoom ?? 6), bearing: Number(map.bearing ?? 0), pitch: Number(map.pitch ?? 0) };
  const save = () => {
    const name = window.prompt('Save map view as', `View ${views.length + 1}`)?.trim();
    if (!name) return;
    const next = [...views.filter(view => view.name !== name), { name, ...camera }];
    onPatch({ properties: { savedViews: next } });
  };
  const load = (name: string) => {
    const view = views.find(item => item.name === name);
    if (view) onPatch({ properties: { center: view.center, zoom: view.zoom, bearing: view.bearing, pitch: view.pitch } });
  };
  return <div className="map-views"><div className="tool-section-title">SAVED MAP VIEWS</div><div className="map-view-row"><select aria-label="Saved map views" value="" onChange={event => load(event.target.value)}><option value="">Load view…</option>{views.map(view => <option key={view.name} value={view.name}>{view.name}</option>)}</select><button onClick={save} title="Save current camera view">Save</button></div>{views.length > 0 && <small className="map-view-hint">{views.length} saved view{views.length === 1 ? '' : 's'}</small>}</div>;
}
