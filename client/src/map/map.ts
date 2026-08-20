import maplibregl,{Map} from 'maplibre-gl';
import { mapSources } from './styles';
export function createMap(container:HTMLElement):Map { return new maplibregl.Map({container,style:mapSources[0].style,center:[-97.278,35.333],zoom:6,attributionControl:{compact:true}}); }
export function setLayerVisibility(map:Map,_name:string,visible:boolean) { for(const layer of map.getStyle().layers||[]) if(layer.id!=='background') map.setLayoutProperty(layer.id,'visibility',visible?'visible':'none'); }
