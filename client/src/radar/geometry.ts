import type { DecodedL3 } from './types';
const EARTH_M=6371008.8;
export function destination(lat:number, lon:number, bearingDeg:number, distanceM:number):[number,number] {
  const φ1=lat*Math.PI/180, λ1=lon*Math.PI/180, θ=bearingDeg*Math.PI/180, δ=distanceM/EARTH_M;
  const φ2=Math.asin(Math.sin(φ1)*Math.cos(δ)+Math.cos(φ1)*Math.sin(δ)*Math.cos(θ));
  const λ2=λ1+Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1),Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2));
  return [((λ2*180/Math.PI+540)%360)-180,φ2*180/Math.PI];
}
export function radarGateCorners(decoded:DecodedL3, lat:number, lon:number):Float64Array {
  const out=new Float64Array(decoded.header.radial_count*decoded.header.gate_count*8), gateCount=decoded.header.gate_count; let p=0;
  for(const radial of decoded.header.radials) for(let g=0;g<gateCount;g++) { const r0=radial.first_gate_m+g*radial.gate_spacing_m, r1=r0+radial.gate_spacing_m, a0=radial.start_azimuth, a1=radial.end_azimuth; for(const [a,r] of [[a0,r0],[a1,r0],[a1,r1],[a0,r1]] as const) { const [x,y]=destination(lat,lon,a,r); out[p++]=x; out[p++]=y; } }
  return out;
}
