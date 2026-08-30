import { SelectionArea } from '@/types';

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

export const expandSelection = (
  sel: SelectionArea,
  amount = 10,
  docW = 1920,
  docH = 1080
): SelectionArea => {
  const newX = Math.max(0, sel.x - amount);
  const newY = Math.max(0, sel.y - amount);
  const newW = Math.min(docW - newX, sel.width + (sel.x - newX) + amount);
  const newH = Math.min(docH - newY, sel.height + (sel.y - newY) + amount);

  return {
    ...sel,
    x: newX,
    y: newY,
    width: newW,
    height: newH,
  };
};

export const contractSelection = (sel: SelectionArea, amount = 10): SelectionArea => {
  const newX = sel.x + amount;
  const newY = sel.y + amount;
  const newW = Math.max(1, sel.width - amount * 2);
  const newH = Math.max(1, sel.height - amount * 2);

  return {
    ...sel,
    x: newX,
    y: newY,
    width: newW,
    height: newH,
  };
};
