import { useEffect } from 'react';
import { pasteClipboardImage } from '@/utils/clipboard';

export const useClipboardLayer = () => {
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            await pasteClipboardImage(blob);
            break; // Stop after first image format to avoid duplicates (e.g. image/png + image/tiff)
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);
};
