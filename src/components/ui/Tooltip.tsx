import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  position = 'bottom',
  children,
  delayMs = 200,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
        break;
    }
    setCoords({ top, left });
  };

  const show = () => {
    calculatePosition();
    timerRef.current = setTimeout(() => {
      calculatePosition();
      setVisible(true);
    }, delayMs);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const translateClasses = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2 translate-y-0',
    left: '-translate-x-full -translate-y-1/2',
    right: 'translate-x-0 -translate-y-1/2',
  }[position];

  return (
    <div
      ref={triggerRef}
      className="inline-flex items-center justify-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className={`fixed z-[9999] pointer-events-none whitespace-nowrap bg-zinc-950/95 border border-zinc-700/80 text-white text-[11px] font-medium px-2 py-1 rounded shadow-2xl backdrop-blur-md flex items-center space-x-1.5 animate-in fade-in zoom-in-95 duration-100 ${translateClasses}`}
          >
            <span>{content}</span>
            {shortcut && (
              <span className="px-1 py-0.2 bg-zinc-800 text-zinc-300 font-mono text-[10px] rounded border border-zinc-700">
                {shortcut}
              </span>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
