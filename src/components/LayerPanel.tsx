import React from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { Eye, EyeOff, Plus, Trash2, Lock, Unlock, Layers, Copy, ArrowDown } from 'lucide-react';
import { BlendMode } from '../types';

const blendModes: { value: BlendMode; label: string; group: string }[] = [
  { value: 'normal', label: 'Normal', group: 'Normal' },
  { value: 'darken', label: 'Darken', group: 'Darken' },
  { value: 'multiply', label: 'Multiply', group: 'Darken' },
  { value: 'color_burn', label: 'Color Burn', group: 'Darken' },
  { value: 'lighten', label: 'Lighten', group: 'Lighten' },
  { value: 'screen', label: 'Screen', group: 'Lighten' },
  { value: 'color_dodge', label: 'Color Dodge', group: 'Lighten' },
  { value: 'linear_dodge', label: 'Linear Dodge (Add)', group: 'Lighten' },
  { value: 'overlay', label: 'Overlay', group: 'Contrast' },
  { value: 'soft_light', label: 'Soft Light', group: 'Contrast' },
  { value: 'hard_light', label: 'Hard Light', group: 'Contrast' },
  { value: 'vivid_light', label: 'Vivid Light', group: 'Contrast' },
  { value: 'difference', label: 'Difference', group: 'Inversion' },
  { value: 'exclusion', label: 'Exclusion', group: 'Inversion' },
  { value: 'hue', label: 'Hue', group: 'Component' },
  { value: 'saturation', label: 'Saturation', group: 'Component' },
  { value: 'color', label: 'Color', group: 'Component' },
  { value: 'luminosity', label: 'Luminosity', group: 'Component' },
];

export const LayerPanel: React.FC = () => {
  const {
    doc,
    addNewLayer,
    deleteLayer,
    selectLayer,
    changeLayerOpacity,
    toggleLayerVisibility,
    changeLayerBlendMode,
  } = useDocumentStore();

  if (!doc) return null;

  const activeLayer = doc.layers.find((l) => l.id === doc.active_layer_id);

  return (
    <div className="flex flex-col h-full bg-ps-panel border-l border-ps-border text-xs select-none">
      {/* Panel Header */}
      <div className="h-8 px-3 bg-ps-header border-b border-ps-border flex items-center justify-between font-semibold text-zinc-300">
        <div className="flex items-center space-x-1.5">
          <Layers size={14} className="text-blue-400" />
          <span>Layers</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">{doc.layers.length} Layers</span>
      </div>

      {/* Layer Properties (Blend Mode & Opacity) */}
      <div className="p-2 border-b border-ps-border/70 bg-ps-surface/50 space-y-2">
        <div className="flex items-center justify-between space-x-2">
          <label className="text-zinc-400 text-[11px]">Mode:</label>
          <select
            value={activeLayer?.blend_mode || 'normal'}
            onChange={(e) => {
              if (activeLayer) changeLayerBlendMode(activeLayer.id, e.target.value as BlendMode);
            }}
            disabled={!activeLayer}
            className="flex-1 bg-ps-surface border border-ps-border rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-blue-500 text-[11px]"
          >
            {blendModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <label className="text-zinc-400 text-[11px]">Opacity:</label>
          <div className="flex-1 flex items-center space-x-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={activeLayer?.opacity ?? 1}
              onChange={(e) => {
                if (activeLayer) changeLayerOpacity(activeLayer.id, Number(e.target.value));
              }}
              disabled={!activeLayer}
              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg appearance-none"
            />
            <span className="font-mono text-[11px] w-8 text-right text-zinc-300">
              {Math.round((activeLayer?.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Layer Stack List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {[...doc.layers].reverse().map((layer) => {
          const isSelected = layer.id === doc.active_layer_id;
          return (
            <div
              key={layer.id}
              onClick={() => selectLayer(layer.id)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500/80 text-white'
                  : 'bg-ps-surface/60 border-ps-border/50 text-zinc-300 hover:bg-ps-surface hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                  }}
                  className="p-0.5 text-zinc-400 hover:text-white transition-colors"
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {layer.visible ? (
                    <Eye size={14} />
                  ) : (
                    <EyeOff size={14} className="text-zinc-600" />
                  )}
                </button>

                <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-mono text-zinc-500">
                  Px
                </div>

                <span className="font-medium truncate max-w-[110px]">{layer.name}</span>
              </div>

              <div className="flex items-center space-x-1.5 text-zinc-500">
                {layer.locked ? (
                  <Lock size={12} />
                ) : (
                  <Unlock size={12} className="opacity-0 hover:opacity-100" />
                )}
                <span className="text-[10px] font-mono capitalize">
                  {layer.blend_mode.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Actions Footer */}
      <div className="h-9 px-3 bg-ps-header border-t border-ps-border flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              if (activeLayer) addNewLayer(`${activeLayer.name} Copy`);
            }}
            className="p-1 text-zinc-400 hover:text-white hover:bg-ps-hover rounded"
            title="Duplicate Layer"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => {}}
            className="p-1 text-zinc-400 hover:text-white hover:bg-ps-hover rounded"
            title="Merge Down"
          >
            <ArrowDown size={14} />
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => addNewLayer()}
            className="p-1 text-zinc-300 hover:text-white hover:bg-ps-hover rounded"
            title="Create a new layer"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => {
              if (activeLayer) deleteLayer(activeLayer.id);
            }}
            disabled={doc.layers.length <= 1}
            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-ps-hover rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete selected layer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
