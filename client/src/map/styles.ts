import type { StyleSpecification } from 'maplibre-gl';
export interface MapSource { id:string; name:string; style:StyleSpecification; attribution:string; }
export const broadcastStyle:StyleSpecification={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'background',type:'background',paint:{'background-color':'#20262b'}},{id:'osm',type:'raster',source:'osm',paint:{'raster-saturation':-1,'raster-contrast':0.15,'raster-brightness-min':0.18,'raster-brightness-max':0.72,'raster-opacity':0.65}}]};
export const mapSources:MapSource[]=[{id:'broadcast-gray',name:'Broadcast Gray',style:broadcastStyle,attribution:'© OpenStreetMap contributors'}];
