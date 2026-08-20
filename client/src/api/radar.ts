import { getBinary, getJson } from './backend';
import type { RadarMetadata } from '../radar/types';
export async function latestRadar(site='TLX',product='94'):Promise<RadarMetadata> { const latest=await getJson<{id:string}>(`/api/v1/radar/${site}/${product}/latest`); return getJson<RadarMetadata>(`/api/v1/radar/files/${latest.id}/metadata`); }
export async function radarPayload(fileId:string):Promise<ArrayBuffer> { return getBinary(`/api/v1/radar/files/${fileId}/data`); }
