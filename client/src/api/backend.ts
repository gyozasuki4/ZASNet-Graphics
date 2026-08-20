import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
const defaultUrl = 'http://127.0.0.1:8080';
export function backendUrl():string { return localStorage.getItem('zasnet.backendUrl') || import.meta.env.VITE_BACKEND_URL || defaultUrl; }
export function setBackendUrl(url:string) { localStorage.setItem('zasnet.backendUrl', url.replace(/\/$/,'')); }
async function request(path:string, init?:RequestInit):Promise<Response> { const url=backendUrl()+path; const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),8000); const native=typeof window!=='undefined' && '__TAURI_INTERNALS__' in window; try { return native ? await tauriFetch(url,{...init,signal:controller.signal}) : await globalThis.fetch(url,{...init,signal:controller.signal}); } finally { clearTimeout(timeout); } }
export async function health():Promise<boolean> { try { const r=await request('/api/v1/health'); return r.ok && (await r.json()).status==='ok'; } catch { return false; } }
export async function getJson<T>(path:string):Promise<T> { const r=await request(path); if(!r.ok) throw new Error(`Backend request failed (${r.status})`); return await r.json() as T; }
export async function getBinary(path:string):Promise<ArrayBuffer> { const r=await request(path); if(!r.ok) throw new Error(`Radar data request failed (${r.status})`); return await r.arrayBuffer(); }
