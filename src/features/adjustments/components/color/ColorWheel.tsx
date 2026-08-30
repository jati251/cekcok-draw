import React, { useRef, useEffect, useCallback, useState } from 'react';
import { hslToRgb, rgbToHsl, rgbaToHex, hexToRgba } from '@/utils/color';

interface Props {
  primaryColor: string;
  onChangeColor: (hex: string) => void;
}

export const ColorWheel: React.FC<Props> = ({ primaryColor, onChangeColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const rgba = hexToRgba(primaryColor, 255);
  const [h, s, l] = rgbToHsl(rgba[0], rgba[1], rgba[2]);

  // Draw vibrant Rainbow Chroma Wheel (Pelangi 360°)
  const drawRainbowWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 3;

    ctx.clearRect(0, 0, width, height);

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const dist = Math.hypot(dx, dy);
        const idx = (y * width + x) * 4;

        if (dist <= radius) {
          // Angle in degrees (0 to 360)
          let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
          if (angle < 0) angle += 360;

          const sat = Math.min(1, Math.max(0, dist / radius));
          // Rainbow Chroma generated at pure chromatic L=0.5
          const [r, g, b] = hslToRgb(angle, sat, 0.5);

          // Sub-pixel antialiasing edge
          const edgeAlpha = Math.min(1.0, Math.max(0.0, radius - dist + 0.5));

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = Math.round(edgeAlpha * 255);
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw active color indicator ring
    const angleRad = (h - 90) * (Math.PI / 180);
    const indRadius = Math.min(radius, s * radius);
    const indX = cx + indRadius * Math.cos(angleRad);
    const indY = cy + indRadius * Math.sin(angleRad);

    ctx.beginPath();
    ctx.arc(indX, indY, 5.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(indX, indY, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [h, s]);

  useEffect(() => {
    drawRainbowWheel();
  }, [drawRainbowWheel]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 3;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    const newSat = Math.min(1, Math.max(0, dist / radius));
    // If current lightness is black (0) or white (1), pick a vibrant 0.5 lightness
    const targetL = l < 0.05 || l > 0.95 ? 0.5 : l;

    const [r, g, b] = hslToRgb(angle, newSat, targetL);
    onChangeColor(rgbaToHex(r, g, b));
  };

  const handleLightnessChange = (newL: number) => {
    const [r, g, b] = hslToRgb(h, s, newL);
    onChangeColor(rgbaToHex(r, g, b));
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      {/* 360° Rainbow Color Disc */}
      <div className="relative p-1 rounded-full bg-zinc-900 border border-zinc-700/80 shadow-md">
        <canvas
          ref={canvasRef}
          width={130}
          height={130}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDragging(true);
            handlePointer(e);
          }}
          onPointerMove={(e) => {
            if (isDragging) handlePointer(e);
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            setIsDragging(false);
          }}
          className="rounded-full cursor-crosshair block"
        />
      </div>

      {/* Lightness Slider with custom track gradient */}
      <div className="w-full flex items-center space-x-2">
        <span className="text-[10px] text-zinc-400 font-mono">L:</span>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.01"
          value={l}
          onChange={(e) => handleLightnessChange(Number(e.target.value))}
          className="flex-1 accent-blue-500 cursor-pointer h-2 bg-gradient-to-r from-black via-zinc-500 to-white rounded-lg appearance-none border border-zinc-700"
        />
        <span className="text-[10px] font-mono text-zinc-300 w-7 text-right">
          {Math.round(l * 100)}%
        </span>
      </div>
    </div>
  );
};
