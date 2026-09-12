import type { DocumentInfo } from '@/types';
import { writeLayerPixels } from '@/services/tauriBridge';
import { useDocumentStore } from '@/stores/documentStore';
import { toast } from '@/stores/toastStore';

export async function persistCanvas(
  canvas: HTMLCanvasElement,
  doc: DocumentInfo,
  layerId: string,
  description: string
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const data = ctx.getImageData(0, 0, doc.width, doc.height).data;
  try {
    await writeLayerPixels(0, 0, doc.width, doc.height, data, layerId, description);
    await useDocumentStore.getState().refreshHistory();
  } catch (error) {
    useDocumentStore.setState({ isDirty: true, error: String(error) });
    toast.error('Could not synchronize canvas', String(error));
  }
}
