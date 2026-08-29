import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Palette, Disc, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';
import { hexToRgba, rgbToHsl, hslToRgb, rgbaToHex } from '../utils/color';

const presetColors = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#71717a',
  '#1e293b',
  '#334155',
  '#475569',
  '#64748b',
  '#94a3b8',
  '#cbd5e1',
];

export const ColorPicker: React.FC = () => {
  const { primaryColor, secondaryColor, setPrimaryColor, swapColors } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'wheel' | 'swatches' | 'sliders'>('wheel');
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);

  const rgba = hexToRgba(primaryColor, 255);
  const [h, s, lightness] = rgbToHsl(rgba[0], rgba[1], rgba[2]);

  // Draw HSV / HSL Color Wheel Canvas
  const drawWheel = useCallback(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 2;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const idx = (y * width + x) * 4;

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
          if (angle < 0) angle += 360;

          const sat = Math.min(1, dist / radius);
          const [r, g, b] = hslToRgb(angle, sat, lightness);

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw active color indicator ring on wheel
    const angleRad = (h - 90) * (Math.PI / 180);
    const indRadius = s * radius;
    const indX = cx + indRadius * Math.cos(angleRad);
    const indY = cy + indRadius * Math.sin(angleRad);

    ctx.beginPath();
    ctx.arc(indX, indY, 4.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(indX, indY, 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [h, s, lightness]);

  useEffect(() => {
    if (activeTab === 'wheel') {
      drawWheel();
    }
  }, [activeTab, drawWheel]);

  const handleWheelPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 2;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);

    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    const newSat = Math.min(1, dist / radius);
    const [r, g, b] = hslToRgb(angle, newSat, lightness);
    const newHex = rgbaToHex(r, g, b);
    setPrimaryColor(newHex);
  };

  return (
    <div className="flex flex-col bg-ps-panel border-b border-ps-border text-xs select-none p-3 space-y-3">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between font-semibold text-zinc-300">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('wheel')}
            className={`p-1 rounded ${activeTab === 'wheel' ? 'bg-blue-600/30 text-blue-400' : 'text-zinc-400 hover:text-white'}`}
            title="Color Wheel"
          >
            <Disc size={13} />
          </button>
          <button
            onClick={() => setActiveTab('swatches')}
            className={`p-1 rounded ${activeTab === 'swatches' ? 'bg-blue-600/30 text-blue-400' : 'text-zinc-400 hover:text-white'}`}
            title="Swatches"
          >
            <Palette size={13} />
          </button>
          <button
            onClick={() => setActiveTab('sliders')}
            className={`p-1 rounded ${activeTab === 'sliders' ? 'bg-blue-600/30 text-blue-400' : 'text-zinc-400 hover:text-white'}`}
            title="RGB / HSL Sliders"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>

        {/* Dual Swatch & Swap Button */}
        <div className="flex items-center space-x-1.5">
          <div className="relative w-7 h-7">
            <div
              style={{ backgroundColor: secondaryColor }}
              className="absolute right-0 bottom-0 w-4 h-4 rounded-sm border border-zinc-600"
              title="Secondary Color"
            />
            <div
              style={{ backgroundColor: primaryColor }}
              className="absolute left-0 top-0 w-4 h-4 rounded-sm border border-white z-10 shadow"
              title="Primary Color"
            />
          </div>
          <button
            onClick={swapColors}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ps-hover"
            title="Swap Colors (X)"
          >
            <ArrowLeftRight size={11} />
          </button>
        </div>
      </div>

      {/* Mode 1: Color Wheel */}
      {activeTab === 'wheel' && (
        <div className="flex flex-col items-center space-y-2">
          <canvas
            ref={wheelCanvasRef}
            width={120}
            height={120}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setIsDraggingWheel(true);
              handleWheelPointer(e);
            }}
            onPointerMove={(e) => {
              if (isDraggingWheel) handleWheelPointer(e);
            }}
            onPointerUp={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
              setIsDraggingWheel(false);
            }}
            className="rounded-full cursor-crosshair shadow-md"
          />

          {/* Lightness Slider */}
          <div className="w-full flex items-center space-x-2">
            <span className="text-[10px] text-zinc-400 font-mono">L:</span>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.01"
              value={lightness}
              onChange={(e) => {
                const newL = Number(e.target.value);
                const [r, g, b] = hslToRgb(h, s, newL);
                setPrimaryColor(rgbaToHex(r, g, b));
              }}
              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
            />
            <span className="text-[10px] font-mono text-zinc-300 w-6 text-right">
              {Math.round(lightness * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Mode 2: Preset Palette Grid */}
      {activeTab === 'swatches' && (
        <div className="grid grid-cols-6 gap-1.5">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => setPrimaryColor(color)}
              style={{ backgroundColor: color }}
              className={`w-full aspect-square rounded border transition-transform hover:scale-110 ${
                primaryColor.toLowerCase() === color.toLowerCase()
                  ? 'border-white ring-1 ring-blue-500'
                  : 'border-zinc-700/80'
              }`}
              title={color}
            />
          ))}
        </div>
      )}

      {/* Mode 3: RGB Sliders */}
      {activeTab === 'sliders' && (
        <div className="space-y-1.5 text-[10px]">
          {(['R', 'G', 'B'] as const).map((channel, i) => (
            <div key={channel} className="flex items-center space-x-2">
              <span className="text-zinc-400 font-mono w-3">{channel}</span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgba[i]}
                onChange={(e) => {
                  const nextRgba: [number, number, number, number] = [...rgba];
                  nextRgba[i] = Number(e.target.value);
                  setPrimaryColor(rgbaToHex(nextRgba[0], nextRgba[1], nextRgba[2]));
                }}
                className="flex-1 accent-blue-500 cursor-pointer h-1 bg-zinc-700 rounded appearance-none"
              />
              <span className="font-mono text-zinc-300 w-6 text-right">{rgba[i]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hex Code Input */}
      <div className="flex items-center space-x-2 pt-1 border-t border-ps-border/50">
        <span className="text-[10px] font-mono text-zinc-400">HEX</span>
        <input
          type="text"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className="flex-1 bg-ps-surface border border-ps-border rounded px-2 py-1 text-zinc-200 font-mono text-[11px] focus:outline-none focus:border-blue-500 uppercase"
          placeholder="#FFFFFF"
        />
      </div>
    </div>
  );
};
