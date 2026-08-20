import { describe, expect, it } from 'vitest';
import { PALETTES, paletteColor } from '../src/radar/palette';
describe('palette lookup',()=>{it('clamps and interpolates stops',()=>{const p=PALETTES[0];const low=paletteColor(p,-100),lowExpected=paletteColor(p,-20),high=paletteColor(p,100),highExpected=paletteColor(p,70);low.forEach((v,i)=>expect(v).toBeCloseTo(lowExpected[i]));high.forEach((v,i)=>expect(v).toBeCloseTo(highExpected[i]));const mid=paletteColor(p,5);expect(mid[0]).toBeGreaterThan(0);expect(mid[0]).toBeLessThan(1);});});
