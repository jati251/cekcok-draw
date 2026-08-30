import React, { useRef, useState } from 'react';
import { rgbaToHex, hexToRgba, rgbToHsv, hsvToRgb } from '@/utils/color';

interface Props {
  primaryColor: string;
  onChangeColor: (hex: string) => void;
}

export const ColorWheel: React.FC<Props> = ({ primaryColor, onChangeColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const rgba = hexToRgba(primaryColor, 255);
  const [h, s, v] = rgbToHsv(rgba[0], rgba[1], rgba[2]);

  const [activeThumb, setActiveThumb] = useState<'hue' | 'sv' | null>(null);

  // Wheel layout constants
  const size = 180;
  const strokeWidth = 14;
  const radius = size / 2;
  const squareSize = Math.floor((radius - strokeWidth) * Math.SQRT2) - 4; // Max square fitting inside ring

  // Calculate pointer positions
  const hueAngleRad = (h * Math.PI) / 180;
  const hueX = radius + (radius - strokeWidth / 2) * Math.cos(hueAngleRad);
  const hueY = radius - (radius - strokeWidth / 2) * Math.sin(hueAngleRad);

  const svX = s * squareSize;
  const svY = (1 - v) * squareSize;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current || e.buttons !== 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - radius;
    const dy = y - radius;
    const dist = Math.hypot(dx, dy);

    let target = activeThumb;
    if (!target) {
      if (dist >= radius - strokeWidth - 5) {
        target = 'hue';
      } else {
        target = 'sv';
      }
      setActiveThumb(target);
    }

    if (target === 'hue') {
      let angle = Math.atan2(-dy, dx) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const newRgb = hsvToRgb(angle, s, v);
      onChangeColor(rgbaToHex(newRgb[0], newRgb[1], newRgb[2]));
    } else if (target === 'sv') {
      const sqX = Math.max(0, Math.min(squareSize, x - (size - squareSize) / 2));
      const sqY = Math.max(0, Math.min(squareSize, y - (size - squareSize) / 2));

      const newS = sqX / squareSize;
      const newV = 1 - sqY / squareSize;

      const newRgb = hsvToRgb(h, newS, newV);
      onChangeColor(rgbaToHex(newRgb[0], newRgb[1], newRgb[2]));
    }
  };

  const handlePointerUp = () => {
    setActiveThumb(null);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-ps-surface rounded-xl select-none touch-none">
      <div
        ref={containerRef}
        style={{ width: size, height: size, position: 'relative' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'conic-gradient(from 90deg, red, magenta, blue, cyan, lime, yellow, red)',
            WebkitMask: `radial-gradient(transparent ${radius - strokeWidth}px, black ${radius - strokeWidth + 1}px)`,
            mask: `radial-gradient(transparent ${radius - strokeWidth}px, black ${radius - strokeWidth + 1}px)`,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: (size - squareSize) / 2,
            top: (size - squareSize) / 2,
            width: squareSize,
            height: squareSize,
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))`,
            borderRadius: 2,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: hueX,
            top: hueY,
            width: strokeWidth + 6,
            height: strokeWidth + 6,
            transform: 'translate(-50%, -50%)',
            border: '2px solid white',
            borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: (size - squareSize) / 2 + svX,
            top: (size - squareSize) / 2 + svY,
            width: 14,
            height: 14,
            transform: 'translate(-50%, -50%)',
            border: '2px solid white',
            borderRadius: '50%',
            boxShadow: '0 1px 4px rgba(0,0,0,0.8), inset 0 0 2px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            backgroundColor: primaryColor,
          }}
        />
      </div>

      <div className="flex items-center space-x-2 mt-4 text-zinc-300 text-xs w-full px-2">
        <div
          className="w-6 h-6 rounded border border-ps-border shadow-sm flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        />
        <span className="font-mono uppercase bg-ps-header px-2 py-1 rounded border border-ps-border flex-1 text-center">
          {primaryColor}
        </span>
      </div>
    </div>
  );
};
