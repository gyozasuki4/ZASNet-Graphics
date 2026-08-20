export type PlaybackSpeed = 0.5|1|1.5|2;
export interface LoopFrame { file_id:string; scan_time:string; }
export function nextIndex(index:number, count:number):number { return count ? (index + 1) % count : 0; }
export function previousIndex(index:number, count:number):number { return count ? (index - 1 + count) % count : 0; }
export function shouldAdvance(now:number, last:number, speed:PlaybackSpeed, intervalMs=5000):boolean { return now-last >= intervalMs / speed; }
export function geometryKey(decoded:{header:{radial_count:number;gate_count:number;radials:unknown[]}}):string { return JSON.stringify([decoded.header.radial_count, decoded.header.gate_count, decoded.header.radials]); }
