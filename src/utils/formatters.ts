/**
 * Pure formatting helpers for UI display.
 */

/** Formats a raw byte count into a human-readable string (e.g. "1.4 MB") */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Formats document pixel dimensions */
export function formatDimensions(width: number, height: number, unit: string = 'px'): string {
  return `${width} × ${height} ${unit}`;
}

/** Formats a float or decimal ratio to a percentage string (e.g. 0.85 -> "85%") */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Formats a Unix timestamp into a relative or locale time string */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
