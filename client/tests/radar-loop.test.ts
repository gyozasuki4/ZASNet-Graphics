import { describe, expect, it } from 'vitest';
import { nextIndex, previousIndex, shouldAdvance } from '../src/radar/loop';

describe('radar playback clock', () => {
  it('advances and wraps independently of scene time', () => {
    expect(nextIndex(2, 3)).toBe(0);
    expect(previousIndex(0, 3)).toBe(2);
  });
  it('uses playback speed to determine frame advancement', () => {
    expect(shouldAdvance(5000, 0, 1)).toBe(true);
    expect(shouldAdvance(2499, 0, 2)).toBe(false);
    expect(shouldAdvance(2500, 0, 2)).toBe(true);
  });
});
