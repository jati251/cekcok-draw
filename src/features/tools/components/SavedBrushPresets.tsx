import { useState } from 'react';
import { BrushSettings } from '@/types';
import { toast } from '@/stores/toastStore';
import {
  BRUSH_PRESETS_KEY,
  BrushPreset,
  MAX_BRUSH_PRESETS,
  parseBrushPresets,
  presetSettings,
  serializeBrushPresets,
} from '../utils/brushPresets';

interface Props {
  settings: BrushSettings;
  onSelect: (settings: Partial<BrushSettings>) => void;
}

export function SavedBrushPresets({ settings, onSelect }: Props) {
  const [presets, setPresets] = useState<BrushPreset[]>(() => {
    try {
      const stored = localStorage.getItem(BRUSH_PRESETS_KEY);
      return stored ? parseBrushPresets(stored) : [];
    } catch {
      return [];
    }
  });
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const persist = (next: BrushPreset[]) => {
    // Write first so a storage/quota failure cannot look like a successful save.
    localStorage.setItem(BRUSH_PRESETS_KEY, serializeBrushPresets(next));
    setPresets(next);
    setError('');
  };
  const run = (action: () => void) => {
    try {
      action();
    } catch (e) {
      setError(String(e));
    }
  };
  return (
    <section
      className="border-t border-white/10 mt-2 pt-2 px-1 text-xs"
      aria-label="Saved brush presets"
    >
      <p className="text-zinc-400 mb-2">My brushes</p>
      {presets.map((preset) => (
        <div key={preset.id} className="flex items-center gap-1">
          <button
            type="button"
            className="flex-1 min-w-0 truncate text-left py-1.5 hover:text-blue-300"
            onClick={() => onSelect(preset.settings)}
          >
            {preset.name}
          </button>
          <button
            type="button"
            className="text-zinc-400 hover:text-red-300 px-1"
            aria-label={`Delete preset ${preset.name}`}
            onClick={() => run(() => persist(presets.filter((p) => p.id !== preset.id)))}
          >
            ×
          </button>
        </div>
      ))}
      <form
        className="flex gap-1 my-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => {
            const trimmed = name.trim();
            if (!trimmed) throw new Error('Enter a preset name');
            if (presets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()))
              throw new Error('Choose a different preset name');
            if (presets.length >= MAX_BRUSH_PRESETS)
              throw new Error('Library is full (100 presets)');
            persist([
              ...presets,
              { id: crypto.randomUUID(), name: trimmed, settings: presetSettings(settings) },
            ]);
            setName('');
          });
        }}
      >
        <input
          aria-label="New brush preset name"
          maxLength={80}
          placeholder="Preset name"
          className="min-w-0 flex-1 bg-white/5 border border-white/15 rounded px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="px-2 rounded bg-blue-600">
          Save
        </button>
      </form>
      <div className="flex gap-3 py-1 text-zinc-300">
        <label className="cursor-pointer hover:text-white">
          Import library
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Import brush library"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              try {
                if (file.size > 1_000_000) throw new Error('Brush library exceeds 1 MB');
                const imported = parseBrushPresets(await file.text());
                const merged = new Map(presets.map((p) => [p.name.toLowerCase(), p]));
                for (const p of imported) {
                  if (merged.has(p.name.toLowerCase()))
                    throw new Error(`A preset named ${p.name} already exists`);
                  merged.set(p.name.toLowerCase(), p);
                }
                if (merged.size > MAX_BRUSH_PRESETS)
                  throw new Error('Library would exceed 100 presets');
                persist([...merged.values()]);
                toast.success('Brush library imported', `${imported.length} presets`);
              } catch (e) {
                setError(String(e));
              }
            }}
          />
        </label>
        <button
          type="button"
          disabled={!presets.length}
          className="disabled:opacity-40 hover:text-white"
          onClick={() =>
            run(() => {
              const url = URL.createObjectURL(
                new Blob([serializeBrushPresets(presets)], { type: 'application/json' })
              );
              const link = document.createElement('a');
              link.href = url;
              link.download = 'cekcok-brushes.json';
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            })
          }
        >
          Export library
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-300 py-1">
          {error}
        </p>
      )}
    </section>
  );
}
