export interface ColorStop { value:number; color:string; }
export interface Palette { name:string; units:string; stops:ColorStop[]; }
export const PALETTES:Palette[]=[
 {name:'ZASNet Broadcast',units:'dBZ',stops:[{value:-20,color:'#303030'},{value:0,color:'#8cc8d8'},{value:10,color:'#4da85b'},{value:20,color:'#d8e54b'},{value:30,color:'#ffd447'},{value:40,color:'#f38b38'},{value:50,color:'#df3e36'},{value:60,color:'#b044a5'},{value:70,color:'#f1c8ed'}]},
 {name:'Classic',units:'dBZ',stops:[{value:-20,color:'#646464'},{value:0,color:'#00ecec'},{value:10,color:'#00a000'},{value:20,color:'#ffff00'},{value:30,color:'#ff9000'},{value:40,color:'#ff0000'},{value:50,color:'#d00000'},{value:60,color:'#ff00ff'},{value:70,color:'#ffffff'}]},
 {name:'Grayscale Debug',units:'dBZ',stops:[{value:-20,color:'#000000'},{value:70,color:'#ffffff'}]}
];
export function hexColor(hex:string):[number,number,number,number] { const n=parseInt(hex.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,1]; }
export function paletteColor(p:Palette,value:number):[number,number,number,number] { if(value<=p.stops[0].value)return hexColor(p.stops[0].color); for(let i=1;i<p.stops.length;i++){const a=p.stops[i-1],b=p.stops[i];if(value<=b.value){const t=(value-a.value)/(b.value-a.value),ca=hexColor(a.color),cb=hexColor(b.color);return ca.map((x,j)=>x+(cb[j]-x)*t) as [number,number,number,number];}} return hexColor(p.stops.at(-1)!.color); }
export function paletteTexture(p:Palette):Uint8Array { const out=new Uint8Array(256*4); for(let i=0;i<256;i++){const c=paletteColor(p,-20+i*90/255);out.set(c.map(x=>Math.round(x*255)),i*4);} return out; }
