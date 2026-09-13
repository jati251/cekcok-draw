// Paint invalidation is independent of React state; the preview coalesces it into one animation frame.
const listeners = new Set<() => void>();
export function invalidateCanvasPreview() {
  for (const listener of listeners) listener();
}
export function subscribeCanvasPreview(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
