export interface BindingContext { radar?: { site?: string; product?: string; scanTime?: string; latestTime?: string; frameCount?: number; status?: string }; scene: { name: string; duration: number; currentTime?: number }; now?: Date; }
function formatClock(date: Date, utc: boolean, format = 'HH:mm:ss') { const parts = new Intl.DateTimeFormat('en-US', { hour: utc ? '2-digit' : 'numeric', minute: '2-digit', second: format.includes('ss') ? '2-digit' : undefined, hour12: format.includes('a'), timeZone: utc ? 'UTC' : undefined }).format(date); return utc ? `${parts.replace(/\s?(AM|PM)/, '')}Z` : parts; }
export function resolveDataText(template: string, context: BindingContext) {
  const radar = context.radar || {}; const now = context.now || new Date();
  const values: Record<string, string | number | undefined> = { 'radar.site': radar.site, 'radar.product': radar.product, 'radar.scan_time': radar.scanTime, 'radar.latest_time': radar.latestTime, 'radar.frame_count': radar.frameCount, 'radar.status': radar.status, 'scene.name': context.scene.name, 'scene.duration': context.scene.duration, 'scene.current_time': context.scene.currentTime?.toFixed(1), 'clock.local': formatClock(now, false), 'clock.utc': formatClock(now, true) };
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (full, key) => values[key] === undefined ? full : String(values[key]));
}
