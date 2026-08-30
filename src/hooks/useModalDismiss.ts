import { useEffect, useCallback, useRef } from 'react';

interface UseModalDismissProps {
  isOpen?: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
}

/**
 * Reusable hook for modal and overlay dismissal.
 * Automatically listens for the Escape key and provides a backdrop click handler.
 */
export function useModalDismiss({
  isOpen = true,
  onClose,
  closeOnEscape = true,
}: UseModalDismissProps) {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeOnEscape]);

  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      // Only close if BOTH mousedown and mouseup (click) originated directly on the backdrop itself.
      // This completely prevents accidental closes when selecting text, dragging inputs, or releasing mouse near dialog borders.
      if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
        onClose();
      }
      mouseDownTargetRef.current = null;
    },
    [onClose]
  );

  return { handleBackdropClick, handleMouseDown };
}
