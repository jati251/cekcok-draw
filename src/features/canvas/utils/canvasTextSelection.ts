import { DocumentInfo } from '@/types';
import { useEditorStore } from '@/stores/editorStore';
import { useDocumentStore } from '@/stores/documentStore';

export const handleCanvasTextInteraction = (
  pos: { x: number; y: number },
  doc: DocumentInfo,
  setActiveTextNode: (node: { x: number; y: number; text: string; layerId?: string } | null) => void
): void => {
  const textLayersData = useEditorStore.getState().textLayersData;
  let matchedLayerId: string | null = null;
  let matchedData = null;

  // Check reverse order (top-most text layers first, matching Photoshop layer order)
  const reversed = [...doc.layers].reverse();
  for (const lyr of reversed) {
    if (lyr.visible && (lyr.layer_type === 'text' || lyr.name.startsWith('Text'))) {
      const data = textLayersData[lyr.id];
      if (data) {
        const lines = data.text.split('\n');
        const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
        const approxWidth = Math.max(120, maxLineLen * data.fontSize * 0.7);
        const approxHeight = Math.max(48, lines.length * data.fontSize * 1.3);

        let minX = data.x;
        if (data.align === 'center') minX = data.x - approxWidth / 2;
        else if (data.align === 'right') minX = data.x - approxWidth;

        const padding = 24;
        if (
          pos.x >= minX - padding &&
          pos.x <= minX + approxWidth + padding &&
          pos.y >= data.y - padding &&
          pos.y <= data.y + approxHeight + padding
        ) {
          matchedLayerId = lyr.id;
          matchedData = data;
          break;
        }
      }
    }
  }

  if (matchedLayerId && matchedData) {
    useDocumentStore.getState().setActiveLayer(matchedLayerId);
    useEditorStore.getState().setTextSettings({
      fontSize: matchedData.fontSize,
      fontFamily: matchedData.fontFamily,
      fontWeight: matchedData.fontWeight,
      align: matchedData.align,
    });
    useEditorStore.getState().setPrimaryColor(matchedData.color);
    setActiveTextNode({
      x: matchedData.x,
      y: matchedData.y,
      text: matchedData.text,
      layerId: matchedLayerId,
    });
    return;
  }

  // If currently active layer is a text layer, check if it has text data
  const activeLyr = doc.layers.find((l) => l.id === doc.active_layer_id);
  if (activeLyr && (activeLyr.layer_type === 'text' || activeLyr.name.startsWith('Text'))) {
    const data = textLayersData[activeLyr.id];
    if (data) {
      useEditorStore.getState().setTextSettings({
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        fontWeight: data.fontWeight,
        align: data.align,
      });
      useEditorStore.getState().setPrimaryColor(data.color);
      setActiveTextNode({
        x: data.x,
        y: data.y,
        text: data.text,
        layerId: activeLyr.id,
      });
      return;
    }
  }

  setActiveTextNode({ x: Math.round(pos.x), y: Math.round(pos.y), text: '' });
};
