import React from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  onChange: (value: number) => void;
}

export const AdjustmentSlider: React.FC<Props> = ({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}) => {
  return (
    <div className="p-2.5 bg-ps-surface/60 rounded-lg border border-ps-border/50 space-y-2">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-zinc-300 font-medium">{label}</span>
        <span className="font-mono text-blue-400 font-bold">{display ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </div>
  );
};
