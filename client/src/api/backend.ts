import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
const defaultUrl = 'http://127.0.0.1:8080';

export type BackendErrorKind = 'invalid_url'|'timeout'|'dns'|'connection_refused'|'permission'|'csp'|'http'|'network'|'invalid_response';

export class BackendRequestError extends Error {
  constructor(public readonly kind:BackendErrorKind, message:string, public readonly url?:string, public readonly status?:number) {
    super(message);
    this.name='BackendRequestError';
  }
}

export function normalizeBackendUrl(value:string):string {
  const candidate=value.trim();
  if(!candidate) throw new BackendRequestError('invalid_url','Backend URL is empty');
  let parsed:URL;
  try { parsed=new URL(candidate); } catch { throw new BackendRequestError('invalid_url',`Invalid backend URL: ${candidate}`); }
  if(parsed.protocol!=='http:' && parsed.protocol!=='https:') throw new BackendRequestError('invalid_url','Backend URL must use http:// or https://');
  if(parsed.username || parsed.password) throw new BackendRequestError('invalid_url','Backend URL must not contain credentials');
  parsed.hash='';
  return parsed.toString().replace(/\/$/,'');
}

export function backendUrl():string {
  const stored=typeof localStorage!=='undefined' ? localStorage.getItem('zasnet.backendUrl') : null;
  const configured=stored || import.meta.env.VITE_BACKEND_URL || defaultUrl;
  try { return normalizeBackendUrl(configured); }
  catch(error) { console.warn('Ignoring invalid saved backend URL',error); return defaultUrl; }
}

export function setBackendUrl(url:string) {
  const normalized=normalizeBackendUrl(url);
  localStorage.setItem('zasnet.backendUrl',normalized);
  return normalized;
}

function classifyRequestError(error:unknown,url:string):BackendRequestError {
  if(error instanceof BackendRequestError) return error;
  const message=error instanceof Error ? error.message : String(error);
  const lower=message.toLowerCase();
  if(lower.includes('abort') || lower.includes('timeout')) return new BackendRequestError('timeout',`Backend request timed out: ${url}`,url);
  if(lower.includes('permission') || lower.includes('not allowed') || lower.includes('scope')) return new BackendRequestError('permission',`Backend request denied by Tauri HTTP permissions: ${url}`,url);
  if(lower.includes('cors') || lower.includes('content security policy') || lower.includes('csp')) return new BackendRequestError('csp',`Backend request blocked by WebView policy: ${url}`,url);
  if(lower.includes('dns') || lower.includes('name or service') || lower.includes('resolve')) return new BackendRequestError('dns',`Backend hostname could not be resolved: ${url}`,url);
  if(lower.includes('refused')) return new BackendRequestError('connection_refused',`Backend connection was refused: ${url}`,url);
  return new BackendRequestError('network',`Backend network request failed: ${message}`,url);
}

async function request(path:string, init?:RequestInit):Promise<Response> {
  const base=backendUrl();
  const url=`${base}${path}`;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  const native=typeof window!=='undefined' && '__TAURI_INTERNALS__' in window;
  try {
    const response=native ? await tauriFetch(url,{...init,signal:controller.signal}) : await globalThis.fetch(url,{...init,signal:controller.signal});
    return response;
  } catch(error) {
    const classified=classifyRequestError(error,url);
    console.error(`[backend:${classified.kind}] ${classified.message}`,error);
    throw classified;
  } finally { clearTimeout(timeout); }
}

export async function health():Promise<boolean> {
  const r=await request('/api/v1/health');
  if(!r.ok) throw new BackendRequestError('http',`Backend health returned HTTP ${r.status}`,r.url||undefined,r.status);
  let body:unknown;
  try { body=await r.json(); } catch { throw new BackendRequestError('invalid_response','Backend health returned invalid JSON',r.url||undefined); }
  if(!body || typeof body!=='object' || (body as {status?:unknown}).status!=='ok') throw new BackendRequestError('invalid_response','Backend health response was not healthy',r.url||undefined);
  return true;
}

export async function getJson<T>(path:string):Promise<T> { const r=await request(path); if(!r.ok) throw new BackendRequestError('http',`Backend request failed (HTTP ${r.status})`,r.url||undefined,r.status); try { return await r.json() as T; } catch { throw new BackendRequestError('invalid_response','Backend returned invalid JSON',r.url||undefined); } }
export async function getBinary(path:string):Promise<ArrayBuffer> { const r=await request(path); if(!r.ok) throw new BackendRequestError('http',`Radar data request failed (HTTP ${r.status})`,r.url||undefined,r.status); return await r.arrayBuffer(); }
