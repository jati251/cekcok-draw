import { useEffect } from 'react';
import { useDocumentStore } from '@/stores/documentStore';

export const useClipboardLayer = () => {
  const { doc, importImageAsLayer, openImageAsDocument } = useDocumentStore();

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            if (doc) {
              await importImageAsLayer(blob, 'Pasted Layer');
            } else {
              await openImageAsDocument(blob, 'Pasted Document');
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [doc, importImageAsLayer, openImageAsDocument]);
};
