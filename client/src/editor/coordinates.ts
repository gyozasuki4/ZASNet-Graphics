import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scenes/types';

export function roundLogical(value: number) { return Math.round(Number.isFinite(value) ? value : 0); }
export function clampCanvasZoom(value: number) { return Math.max(0.25, Math.min(2.5, Number(value.toFixed(2)))); }
export function logicalToDisplay(value: number, displaySize: number, logicalSize = CANVAS_WIDTH) { return value * displaySize / logicalSize; }
export function displayToLogical(value: number, displaySize: number, logicalSize = CANVAS_WIDTH) { return value * logicalSize / displaySize; }
export function canvasAspect() { return CANVAS_WIDTH / CANVAS_HEIGHT; }
