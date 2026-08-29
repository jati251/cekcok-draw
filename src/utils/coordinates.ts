/**
 * Coordinate transformations between client screen pixels and document canvas pixels
 */
export const screenToCanvasCoord = (
  clientX: number,
  clientY: number,
  box: HTMLElement | null,
  docWidth: number,
  zoom: number
): { x: number; y: number } => {
  if (!box || !docWidth || zoom <= 0) return { x: 0, y: 0 };
  const rect = box.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };

  const docX = (clientX - rect.left) / zoom;
  const docY = (clientY - rect.top) / zoom;

  return { x: docX, y: docY };
};
