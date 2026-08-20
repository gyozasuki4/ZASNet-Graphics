import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeL3Z } from '../src/radar/l3z';
const fixture = readFileSync(new URL('./fixtures/tlx-product-94.l3z', import.meta.url));
describe('.l3z decoder',()=>{
 it('decodes geometry, typed values, and states',()=>{const d=decodeL3Z(fixture.buffer.slice(fixture.byteOffset,fixture.byteOffset+fixture.byteLength));expect(d.header.radar_site).toBe('TLX');expect(d.header.product_code).toBe('94');expect(d.header.radial_count).toBe(360);expect(d.header.gate_count).toBe(460);expect(d.values.length).toBe(360*460);expect(d.states.length).toBe(360*460);expect(d.states.some(x=>x===0)).toBe(true);});
 it('rejects malformed magic, lengths, and compressed bytes',()=>{const bad=new Uint8Array(fixture);bad[0]=0;expect(()=>decodeL3Z(bad.buffer)).toThrow(/magic/);const length=new Uint8Array(fixture);length[9]=255;length[10]=255;length[11]=255;length[12]=127;expect(()=>decodeL3Z(length.buffer)).toThrow(/header length/);const corrupt=new Uint8Array(fixture);const headerLength=new DataView(corrupt.buffer).getUint32(9,true);for(let i=0;i<20;i++)corrupt[13+headerLength+i]=0;expect(()=>decodeL3Z(corrupt.buffer)).toThrow(/zlib|radial/);});
});
