import React from 'react';
import { hexToRgba, rgbaToHex } from '../../utils/color';

interface Props {
  activeColor: string;
  onChangeColor: (hex: string) => void;
}

export const ColorSliders: React.FC<Props> = ({ activeColor, onChangeColor }) => {
  const rgba = hexToRgba(activeColor, 255);

  const handleRgbChange = (channelIndex: number, val: number) => {
    const nextRgba: [number, number, number, number] = [...rgba];
    nextRgba[channelIndex] = Math.min(255, Math.max(0, val));
    onChangeColor(rgbaToHex(nextRgba[0], nextRgba[1], nextRgba[2]));
  };

  return (
    <div className="space-y-2 text-[10px] py-1">
      {(['R', 'G', 'B'] as const).map((channel, i) => (
        <div key={channel} className="flex items-center space-x-2">
          <span className="text-zinc-400 font-mono w-3 font-semibold">{channel}</span>
          <input
            type="range"
            min="0"
            max="255"
            value={rgba[i]}
            onChange={(e) => handleRgbChange(i, Number(e.target.value))}
            className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded appearance-none"
          />
          <span className="font-mono text-zinc-300 w-7 text-right">{rgba[i]}</span>
        </div>
      ))}
    </div>
  );
};
