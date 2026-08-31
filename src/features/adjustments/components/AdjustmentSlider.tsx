import React from 'react';

interface AdjustmentSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  title?: string;
}

export const AdjustmentSlider: React.FC<AdjustmentSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  title,
}) => {
  return (
    <div className="p-2.5 bg-ps-surface/60 rounded-lg border border-ps-border/50 space-y-2">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-zinc-300 font-medium">{label}</span>
        <span className="font-mono text-blue-400 font-bold">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        title={title}
      />
    </div>
  );
};
