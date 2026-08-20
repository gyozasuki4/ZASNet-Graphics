import { getBinary, getJson } from './backend';
import type { RadarMetadata } from '../radar/types';
export async function latestRadar(site='KRIW',product='94'):Promise<RadarMetadata> { const latest=await getJson<{id:string}>(`/api/v1/radar/${site}/${product}/latest`); return getJson<RadarMetadata>(`/api/v1/radar/files/${latest.id}/metadata`); }
export async function radarPayload(fileId:string):Promise<ArrayBuffer> { return getBinary(`/api/v1/radar/files/${fileId}/data`); }
export async function radarMetadata(fileId:string):Promise<RadarMetadata> { return getJson<RadarMetadata>(`/api/v1/radar/files/${fileId}/metadata`); }
export interface RadarFrame { file_id:string; scan_time:string; file_size:number; decoded_size:number|null; decode_status:string; }
export interface RadarStatus { site:string; product:string; status:'live'|'stale'|'offline'|'disabled'|'error'; latest_scan:string|null; age_seconds:number|null; frame_count_60m:number; last_poll?:string|null; }
export async function radarStatus(site='KRIW', product='94'):Promise<RadarStatus> { return getJson(`/api/v1/radar/${site}/${product}/status`); }
export async function radarFrames(minutes=30, site='KRIW', product='94'):Promise<RadarFrame[]> { return (await getJson<{frames:RadarFrame[]}>(`/api/v1/radar/${site}/${product}/frames?minutes=${minutes}&limit=100`)).frames; }
