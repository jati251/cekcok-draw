import React from 'react';
import { useEditorStore } from '../../stores/editorStore';

export const SelectionBox: React.FC = () => {
  const { selection } = useEditorStore();
  if (!selection || !selection.active || selection.width <= 0 || selection.height <= 0) {
    return null;
  }

  return (
    <div
      style={{
        left: selection.x,
        top: selection.y,
        width: selection.width,
        height: selection.height,
      }}
      className="absolute border border-dashed border-black bg-blue-500/10 pointer-events-none ring-1 ring-white/70 z-40"
    />
  );
};
