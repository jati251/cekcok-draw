import React, { useState } from 'react';
import { Settings, Monitor, LayoutGrid, X, Keyboard, Zap, Palette, HardDrive } from 'lucide-react';
import { useEditorStore, ThemeMode } from '@/stores/editorStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PreferencesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { showGrid, setShowGrid, showRulers, setShowRulers, theme, setTheme } = useEditorStore();
  const [activeTab, setActiveTab] = useState<
    'general' | 'appearance' | 'canvas' | 'workspace' | 'performance' | 'shortcuts'
  >('general');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-ps-panel border border-zinc-700/60 rounded-xl shadow-2xl w-full max-w-2xl flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-zinc-900/50 border-r border-zinc-700/60 flex flex-col p-2">
          <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Preferences
          </div>

          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
              activeTab === 'general'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>General</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors mt-1 ${
              activeTab === 'appearance'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Appearance</span>
          </button>

          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors mt-1 ${
              activeTab === 'canvas'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Canvas & Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors mt-1 ${
              activeTab === 'workspace'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors mt-1 ${
              activeTab === 'performance'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Performance</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors mt-1 ${
              activeTab === 'shortcuts'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Shortcuts</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/60 bg-zinc-800/30">
            <h2 className="text-lg font-semibold text-zinc-100 capitalize">
              {activeTab === 'canvas' ? 'Canvas & Grid' : activeTab} Preferences
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-zinc-900/20">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-700/50 pb-2">
                    Language
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-zinc-400">UI Language</div>
                    <select className="bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="en">English (Default)</option>
                      <option value="id" disabled>
                        Bahasa Indonesia (Coming Soon)
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-700/50 pb-2">
                    Color Theme
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-zinc-400">Application Theme</div>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as ThemeMode)}
                      className="bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="dark">Dark Mode</option>
                      <option value="light">Light Mode</option>
                      <option value="system">System Preference</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-700/50 pb-2">
                    Scratch Disk & History
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-zinc-400">Max Undo States</div>
                    <input
                      type="number"
                      defaultValue={50}
                      className="w-20 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 px-3 py-1.5 text-right"
                      disabled
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-zinc-400">Auto-Save Interval (mins)</div>
                    <input
                      type="number"
                      defaultValue={5}
                      className="w-20 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 px-3 py-1.5 text-right"
                      disabled
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-700/50 pb-2">
                    Hardware Acceleration
                  </h3>
                  <div className="flex items-start space-x-3">
                    <Monitor className="w-5 h-5 text-zinc-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-zinc-200">Use GPU Compositing</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        CekcokDraw uses wgpu internally for all rendering operations. This cannot be
                        disabled.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'canvas' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-700/50 pb-2">
                    View Overlays
                  </h3>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRulers}
                      onChange={(e) => setShowRulers(e.target.checked)}
                      className="rounded border-zinc-600 text-blue-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800"
                    />
                    <div className="text-sm text-zinc-300">Show Rulers (Cmd+R)</div>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="rounded border-zinc-600 text-blue-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800"
                    />
                    <div className="text-sm text-zinc-300">Show Pixel Grid (Cmd+')</div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div className="space-y-3 text-center py-10 text-zinc-500">
                  <Keyboard className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>Keyboard shortcut mapping will be available in a future update.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-700/60 bg-zinc-800/30 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
