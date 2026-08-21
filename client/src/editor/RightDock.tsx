import { useState } from 'react';
import { CurrentToolPanel } from './BrowserPanels';
import { LayersPanel, PropertiesPanel } from './InspectorPanels';
import type { SceneObject, AnimationProperty } from '../scenes/types';
import type { RadarEditorStatus, RadarMapHandle } from './RadarMapObject';
import type { ReactNode } from 'react';

type Props = { object?: SceneObject; objects: SceneObject[]; selectedId?: string; tool: 'select' | 'pan-canvas' | 'map-nav'; radarStatus?: RadarEditorStatus; radarRef: React.RefObject<RadarMapHandle | null>; onPatch: (patch: Partial<SceneObject> & { properties?: Record<string, unknown> }) => void; onSelect: (id: string) => void; onToolChange: (tool: 'select' | 'pan-canvas' | 'map-nav') => void; onMapAction: (action: 'fit' | 'reset' | 'full-frame') => void; onImage: (source: string) => void; onKeyframe: (property: AnimationProperty, value: number) => void; hasKeyframe: (property: AnimationProperty) => boolean; onLayerPatch: (id: string, patch: Partial<SceneObject>) => void; onReorder: (id: string, direction: -1 | 1) => void; onFront: (id: string) => void; onBack: (id: string) => void; onDelete: (id: string) => void; onContextMenu: (event: React.MouseEvent, object?: SceneObject) => void };
export function RightDock(props: Props) {
  const [tab, setTab] = useState<'tool' | 'properties' | 'layers'>('tool');
  const tabs: Array<[typeof tab, string]> = [['tool', 'Tool'], ['properties', 'Properties'], ['layers', 'Layers']];
  let content: ReactNode;
  if (tab === 'tool') content = <CurrentToolPanel object={props.object} tool={props.tool} radarStatus={props.radarStatus} radarRef={props.radarRef} onPatch={props.onPatch} onToolChange={props.onToolChange} />;
  else if (tab === 'properties') content = <PropertiesPanel object={props.object} radarStatus={props.radarStatus} onPatch={props.onPatch} onMapAction={props.onMapAction} onImage={props.onImage} onKeyframe={props.onKeyframe} hasKeyframe={props.hasKeyframe} />;
  else content = <LayersPanel objects={props.objects} selectedId={props.selectedId} onSelect={props.onSelect} onPatch={props.onLayerPatch} onReorder={props.onReorder} onFront={props.onFront} onBack={props.onBack} onDelete={props.onDelete} onContextMenu={props.onContextMenu} />;
  return <aside className="right-dock"><div className="right-dock-tabs">{tabs.map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}</div><div className="right-dock-content">{content}</div></aside>;
}
