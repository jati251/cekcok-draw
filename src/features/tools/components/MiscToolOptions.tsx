import React from 'react';
import { BrushSettings } from '@/types';

interface EraserProps {
  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
}

export const EraserOptions: React.FC<EraserProps> = ({ brushSettings, setBrushSettings }) => (
  <div className="flex items-center gap-2 flex-shrink-0">
    <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
      <span className="text-zinc-400 text-[10px] font-medium">Size</span>
      <input
        type="range"
        min="1"
        max="200"
        value={brushSettings.size}
        onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
        className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
      />
      <span className="font-mono text-[11px] w-8 text-zinc-100 text-right font-medium">
        {brushSettings.size}px
      </span>
    </div>

    <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
      <span className="text-zinc-400 text-[10px] font-medium">Hardness</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={brushSettings.hardness}
        onChange={(e) => setBrushSettings({ hardness: Number(e.target.value) })}
        className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
      />
      <span className="font-mono text-[11px] w-7 text-zinc-100 text-right font-medium">
        {Math.round(brushSettings.hardness * 100)}%
      </span>
    </div>
  </div>
);

interface SmudgeProps {
  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
  smudgeStrength: number;
  setSmudgeStrength: (strength: number) => void;
}

export const SmudgeOptions: React.FC<SmudgeProps> = ({
  brushSettings,
  setBrushSettings,
  smudgeStrength,
  setSmudgeStrength,
}) => (
  <div className="flex items-center gap-2 flex-shrink-0">
    <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
      <span className="text-zinc-400 text-[10px] font-medium">Size</span>
      <input
        type="range"
        min="2"
        max="150"
        value={brushSettings.size}
        onChange={(e) => setBrushSettings({ size: Number(e.target.value) })}
        className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
      />
      <span className="font-mono text-[11px] w-8 text-zinc-100 text-right font-medium">
        {brushSettings.size}px
      </span>
    </div>

    <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
      <span className="text-zinc-400 text-[10px] font-medium">Strength</span>
      <input
        type="range"
        min="0.05"
        max="1"
        step="0.05"
        value={smudgeStrength}
        onChange={(e) => setSmudgeStrength(Number(e.target.value))}
        className="w-14 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
      />
      <span className="font-mono text-[11px] w-7 text-zinc-100 text-right font-medium">
        {Math.round(smudgeStrength * 100)}%
      </span>
    </div>
  </div>
);

interface BucketProps {
  bucketTolerance: number;
  setBucketTolerance: (tolerance: number) => void;
  bucketContiguous: boolean;
  setBucketContiguous: (contiguous: boolean) => void;
  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;
}

export const BucketOptions: React.FC<BucketProps> = ({
  bucketTolerance,
  setBucketTolerance,
  bucketContiguous,
  setBucketContiguous,
  brushSettings,
  setBrushSettings,
}) => (
  <div className="flex items-center gap-2 flex-shrink-0">
    <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
      <span className="text-zinc-400 text-[10px] font-medium">Tolerance</span>
      <input
        type="range"
        min="0"
        max="255"
        value={bucketTolerance}
        onChange={(e) => setBucketTolerance(Number(e.target.value))}
        className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
      />
      <span className="text-zinc-100 text-[11px] font-mono w-7 text-right">{bucketTolerance}</span>
    </div>

    <div className="flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-xl px-3 h-7 transition-colors">
      <span className="text-zinc-400 text-[10px] font-medium">Opacity</span>
      <input
        type="range"
        min="1"
        max="100"
        value={Math.round(brushSettings.opacity * 100)}
        onChange={(e) => setBrushSettings({ opacity: Number(e.target.value) / 100 })}
        className="w-16 accent-blue-500 cursor-pointer h-1.5 bg-white/10 rounded-full appearance-none"
      />
      <span className="text-zinc-100 text-[11px] font-mono w-8 text-right">
        {Math.round(brushSettings.opacity * 100)}%
      </span>
    </div>

    <label className="flex items-center space-x-2 px-3 h-7 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 cursor-pointer transition-colors text-[11px] text-zinc-300">
      <input
        type="checkbox"
        checked={bucketContiguous}
        onChange={(e) => setBucketContiguous(e.target.checked)}
        className="rounded border-zinc-600 text-blue-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 cursor-pointer"
      />
      <span className="text-[10px] font-medium text-zinc-300">Contiguous</span>
    </label>
  </div>
);
