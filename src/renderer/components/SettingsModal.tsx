import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (settings.theme) {
      setTheme(settings.theme);
    }
  }, [settings.theme]);

  if (!isOpen) return null;

  const isLight = (settings.theme || theme) === 'light';

  const handleSelectTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    onSaveSettings({ theme: newTheme });
  };

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
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 border ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-400/20'
            : 'bg-[#0f1424] border-violet-500/30 text-white shadow-violet-950/50'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-base">
            <Settings className="w-5 h-5 text-violet-500" />
            <span>Settings & Preferences</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar text-sm">
          {/* Appearance / Theme */}
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
              Appearance
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectTheme('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-violet-950/70 border-violet-500 text-white shadow-lg shadow-violet-900/30 font-semibold'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                <Moon className="w-4 h-4 text-violet-400" />
                <span>Midnight Dark</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTheme('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                  theme === 'light'
                    ? isLight
                      ? 'bg-violet-100 border-violet-500 text-violet-900 shadow-md font-semibold'
                      : 'bg-violet-950/70 border-violet-500 text-white shadow-lg font-semibold'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Clean Light</span>
              </button>
            </div>
          </div>

          {/* Search Engine */}
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
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
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    searchEngine === engine.id
                      ? isLight
                        ? 'bg-violet-100 border-violet-500 text-violet-900 font-semibold shadow-sm'
                        : 'bg-violet-950/60 border-violet-500 text-white font-medium shadow-md shadow-violet-900/20'
                      : isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-violet-500" />
                  <span>{engine.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Home URL */}
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
              Home Page URL
            </label>
            <div
              className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-xs ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-[#171e33] border-white/10 text-white'
              }`}
            >
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={homeUrl}
                onChange={(e) => setHomeUrl(e.target.value)}
                placeholder="adal://newtab or https://..."
                className="bg-transparent border-none outline-none flex-1 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Download Location Mode */}
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
              Download Location
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSaveSettings({ downloadLocationMode: 'downloads' })}
                className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                  (settings.downloadLocationMode || 'downloads') === 'downloads'
                    ? isLight
                      ? 'bg-violet-100 border-violet-500 text-violet-900 font-semibold'
                      : 'bg-violet-950/60 border-violet-500 text-white font-medium shadow-md shadow-violet-900/20'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                <div className="font-medium">System Downloads</div>
                <div className="text-[10px] text-slate-400 mt-0.5">User Downloads Folder</div>
              </button>

              <button
                type="button"
                onClick={() => onSaveSettings({ downloadLocationMode: 'managed' })}
                className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                  settings.downloadLocationMode === 'managed'
                    ? isLight
                      ? 'bg-violet-100 border-violet-500 text-violet-900 font-semibold'
                      : 'bg-violet-950/60 border-violet-500 text-white font-medium shadow-md shadow-violet-900/20'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/[0.06]'
                }`}
              >
                <div className="font-medium">AdaL Nexus Managed</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Dedicated app folder</div>
              </button>
            </div>
          </div>

          {/* Privacy & Data */}
          <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <label className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
              Privacy & Browsing Data
            </label>
            <div
              className={`p-3 rounded-xl border space-y-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Clear Browsing History & Session Data
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Deletes history records, cached web assets, and Chromium cookies. Bookmarks and preferences are preserved.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Clear Browsing Data:\n\nThis will permanently delete:\n- All local browsing history records\n- Chromium website session cookies\n- Temporary web cache files\n\nYour bookmarks and theme settings will NOT be deleted.\n\nProceed?'
                    );
                    if (confirmed) {
                      onClearHistory();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ml-3"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between p-4 border-t ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20'
          }`}
        >
          <button
            type="button"
            onClick={handleReset}
            className={`flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-violet-500/30 transition-all cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
