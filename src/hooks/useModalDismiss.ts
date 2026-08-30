import { useEffect, useCallback } from 'react';

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

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return { handleBackdropClick };
}
