import { unzlibSync } from 'fflate';
import type { DecodedL3, L3Header } from './types';
const MAGIC = new TextEncoder().encode('ZASNETL3');
const MAX_HEADER = 4 * 1024 * 1024, MAX_BODY = 64 * 1024 * 1024, HEADER_BYTES = 13;
function fail(message:string):never { throw new Error(`Invalid .l3z payload: ${message}`); }
function u32(view:DataView, offset:number) { return view.getUint32(offset, true); }
export function decodeL3Z(input:ArrayBuffer):DecodedL3 {
  if (input.byteLength < HEADER_BYTES) fail('truncated header');
  const bytes = new Uint8Array(input), view = new DataView(input);
  for (let i=0;i<MAGIC.length;i++) if (bytes[i] !== MAGIC[i]) fail('bad magic');
  if (view.getUint8(8) !== 1) fail('unsupported format version');
  const headerLength = u32(view, 9); if (headerLength > MAX_HEADER || HEADER_BYTES + headerLength > input.byteLength) fail('invalid header length');
  let header:L3Header; try { header = JSON.parse(new TextDecoder().decode(bytes.subarray(HEADER_BYTES, HEADER_BYTES + headerLength))); } catch { fail('malformed JSON header'); }
  if (header.format !== 'zasnet-level3-radials' || header.version !== 1 || header.compression !== 'zlib') fail('unsupported format');
  if (!Number.isInteger(header.radial_count) || !Number.isInteger(header.gate_count) || header.radial_count < 1 || header.radial_count > 2000 || header.gate_count < 1 || header.gate_count > 2000 || header.radials.length !== header.radial_count) fail('invalid geometry counts');
  let body:Uint8Array; try { body = unzlibSync(bytes.subarray(HEADER_BYTES + headerLength)); } catch { fail('zlib decompression failed'); }
  if (body.byteLength > MAX_BODY) fail('decoded body too large');
  const total = header.radial_count * header.gate_count, values = new Float32Array(total), states = new Uint8Array(total);
  const bodyView = new DataView(body.buffer, body.byteOffset, body.byteLength);
  for (let r=0;r<header.radials.length;r++) {
    const d=header.radials[r]; if (d.gate_count !== header.gate_count || d.value_offset < 0 || d.state_offset < 0 || d.value_offset + d.gate_count*4 > body.byteLength || d.state_offset + d.gate_count > body.byteLength) fail('radial section outside body');
    for (let g=0;g<d.gate_count;g++) { values[r*header.gate_count+g]=bodyView.getFloat32(d.value_offset+g*4,true); const state=body[d.state_offset+g]; if (state > 3) fail('unknown state code'); states[r*header.gate_count+g]=state; }
  }
  return {header, values, states};
}
