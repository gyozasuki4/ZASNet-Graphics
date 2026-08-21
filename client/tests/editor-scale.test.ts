import { describe, expect, it } from 'vitest';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../src/scenes/types';

describe('logical canvas scaling', () => {
  it('maps logical 1920x1080 coordinates to a scaled display', () => { const displayWidth = 960, scale = displayWidth / CANVAS_WIDTH; expect(1920 * scale).toBe(960); expect(1080 * scale).toBe(540); expect(480 / scale).toBe(960); expect(CANVAS_WIDTH / CANVAS_HEIGHT).toBeCloseTo(16 / 9); });
});
