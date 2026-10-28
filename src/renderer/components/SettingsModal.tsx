import React, { useState } from 'react';
import { Settings, X, Moon, Sun, Search, Globe, RotateCcw, Trash2 } from 'lucide-react';
import type { BrowserSettings } from '../../shared/browser-types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: BrowserSettings;
  onClose: () => void;
  onSaveSettings: (settings: Partial<BrowserSettings>) => void;
  onClearHistory: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSaveSettings,
  onClearHistory,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme || 'dark');
  const [searchEngine, setSearchEngine] = useState(settings.searchEngine || 'google');
  const [homeUrl, setHomeUrl] = useState(settings.homeUrl || 'adal://newtab');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      theme,
      searchEngine,
      homeUrl,
    });
    onClose();
  };

  const handleReset = () => {
    setTheme('dark');
    setSearchEngine('google');
    setHomeUrl('adal://newtab');
    onSaveSettings({
      theme: 'dark',
      searchEngine: 'google',
      homeUrl: 'adal://newtab',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f1424] border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Settings className="w-5 h-5 text-violet-400" />
            <span>Settings & Preferences</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar text-sm">
          {/* Appearance / Theme */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Appearance
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-violet-950/60 border-violet-500 text-white shadow-lg shadow-violet-900/30 font-medium'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                <Moon className="w-4 h-4 text-violet-400" />
                <span>Midnight Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                  theme === 'light'
                    ? 'bg-violet-950/60 border-violet-500 text-white shadow-lg shadow-violet-900/30 font-medium'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* Search Engine */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Default Search Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'google', label: 'Google' },
                { id: 'duckduckgo', label: 'DuckDuckGo' },
                { id: 'bing', label: 'Bing' },
                { id: 'brave', label: 'Brave' },
              ].map((engine) => (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => setSearchEngine(engine.id as any)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                    searchEngine === engine.id
                      ? 'bg-violet-950/60 border-violet-500 text-white font-medium shadow-md shadow-violet-900/20'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-violet-400" />
                  <span>{engine.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Home URL */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Home Page URL
            </label>
            <div className="flex items-center gap-2 bg-[#171e33] border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={homeUrl}
                onChange={(e) => setHomeUrl(e.target.value)}
                placeholder="adal://newtab or https://..."
                className="bg-transparent border-none outline-none flex-1 placeholder-slate-500"
              />
            </div>
          </div>

          {/* Privacy & Data */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Privacy & Local Data
            </label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div>
                <div className="text-xs font-medium text-white">Browsing Data</div>
                <div className="text-[11px] text-slate-400">
                  Delete all locally recorded browsing history
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all browsing history?')) {
                    onClearHistory();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-violet-500/30 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
