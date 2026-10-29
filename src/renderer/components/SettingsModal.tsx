import React, { useState, useEffect } from 'react';
import { Settings, X, Sun, Search, Globe, RotateCcw, Trash2, Sparkles, Check, Activity, RefreshCw } from 'lucide-react';
import type { BrowserSettings, ThemeMode, WallpaperInfo } from '../../shared/browser-types';

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
  const getInitialThemeMode = (): ThemeMode => {
    if (settings.themeMode) return settings.themeMode;
    if (settings.backgroundMode === 'live') return 'live-wallpaper';
    if (settings.theme === 'light' || settings.backgroundMode === 'white') return 'soft-light';
    return 'dark-cosmic';
  };

  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode());
  const [searchEngine, setSearchEngine] = useState(settings.searchEngine || 'google');
  const [homeUrl, setHomeUrl] = useState(settings.homeUrl || 'adal://newtab');
  const [wallpaperInfo, setWallpaperInfo] = useState<WallpaperInfo | null>(
    settings.cachedWallpaper || null
  );
  const [wallpaperInterval, setWallpaperInterval] = useState<number>(
    settings.wallpaperRefreshInterval || 2.5
  );
  const [isRefreshingWallpaper, setIsRefreshingWallpaper] = useState(false);

  useEffect(() => {
    setThemeMode(getInitialThemeMode());
  }, [settings.themeMode, settings.theme, settings.backgroundMode]);

  useEffect(() => {
    if (isOpen && window.adalNexus?.getLiveWallpaper) {
      window.adalNexus.getLiveWallpaper().then((info) => {
        if (info) setWallpaperInfo(info);
      });
    }
  }, [isOpen]);

  const handleManualRefresh = async () => {
    if (isRefreshingWallpaper) return;
    setIsRefreshingWallpaper(true);
    try {
      if (window.adalNexus?.refreshLiveWallpaper) {
        const updated = await window.adalNexus.refreshLiveWallpaper();
        if (updated) setWallpaperInfo(updated);
      }
    } catch (err) {
      console.warn('Error refreshing wallpaper:', err);
    } finally {
      setIsRefreshingWallpaper(false);
    }
  };

  if (!isOpen) return null;

  const isLight = themeMode === 'soft-light' || (settings.theme === 'light' && themeMode !== 'dark-cosmic' && themeMode !== 'live-wallpaper');

  const handleSelectThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    const theme = mode === 'soft-light' ? 'light' : 'dark';
    const backgroundMode = mode === 'soft-light' ? 'white' : mode === 'live-wallpaper' ? 'live' : 'cosmic';
    onSaveSettings({
      themeMode: mode,
      theme,
      backgroundMode,
    });
  };

  const handleSave = () => {
    const theme = themeMode === 'soft-light' ? 'light' : 'dark';
    const backgroundMode = themeMode === 'soft-light' ? 'white' : themeMode === 'live-wallpaper' ? 'live' : 'cosmic';
    onSaveSettings({
      themeMode,
      theme,
      backgroundMode,
      searchEngine,
      homeUrl,
      wallpaperRefreshInterval: wallpaperInterval,
    });
    onClose();
  };

  const handleReset = () => {
    setThemeMode('dark-cosmic');
    setSearchEngine('google');
    setHomeUrl('adal://newtab');
    setWallpaperInterval(30);
    onSaveSettings({
      themeMode: 'dark-cosmic',
      theme: 'dark',
      backgroundMode: 'cosmic',
      searchEngine: 'google',
      homeUrl: 'adal://newtab',
      wallpaperRefreshInterval: 30,
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
          {/* Theme & Background Mode (3 Distinct Choices) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
                Theme &amp; Home Background Mode
              </label>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isLight ? 'bg-violet-100 text-violet-700' : 'bg-violet-900/40 text-violet-300'
              }`}>
                3 Distinct Modes
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Option 1: Dark Cosmic 3D (Default Cosmic) */}
              <button
                type="button"
                onClick={() => handleSelectThemeMode('dark-cosmic')}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  themeMode === 'dark-cosmic'
                    ? isLight
                      ? 'bg-violet-50 border-violet-500 text-violet-900 shadow-md ring-2 ring-violet-500/40 font-semibold'
                      : 'bg-violet-950/70 border-violet-500 text-white shadow-lg shadow-violet-900/30 ring-2 ring-violet-500/50 font-semibold'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <div className="p-2 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Dark Cosmic 3D (Default Cosmic)</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-300 border border-violet-400/40">
                      Default
                    </span>
                  </div>
                  <p className={`text-[11px] font-normal mt-1 leading-snug ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Vibrant 3D cosmic landscape with layered mountains, planets, reflective water & starlight (Static high clarity).
                  </p>
                </div>
                {themeMode === 'dark-cosmic' && (
                  <div className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center shrink-0 mt-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Option 2: Soft Light (Default White) */}
              <button
                type="button"
                onClick={() => handleSelectThemeMode('soft-light')}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  themeMode === 'soft-light'
                    ? isLight
                      ? 'bg-violet-50 border-violet-500 text-violet-900 shadow-md ring-2 ring-violet-500/40 font-semibold'
                      : 'bg-violet-950/70 border-violet-500 text-white shadow-lg shadow-violet-900/30 ring-2 ring-violet-500/50 font-semibold'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0 mt-0.5">
                  <Sun className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Soft Light (Default White)</span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-400/30">
                      Comfort
                    </span>
                  </div>
                  <p className={`text-[11px] font-normal mt-1 leading-snug ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Refined soft off-white & lavender palette, crisp readable typography, zero glare, and zero wallpaper distraction.
                  </p>
                </div>
                {themeMode === 'soft-light' && (
                  <div className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center shrink-0 mt-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Option 3: Live Wallpaper */}
              <button
                type="button"
                onClick={() => handleSelectThemeMode('live-wallpaper')}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                  themeMode === 'live-wallpaper'
                    ? isLight
                      ? 'bg-violet-50 border-violet-500 text-violet-900 shadow-md ring-2 ring-violet-500/40 font-semibold'
                      : 'bg-violet-950/70 border-violet-500 text-white shadow-lg shadow-violet-900/30 ring-2 ring-violet-500/50 font-semibold'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <div className="p-2 rounded-lg bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Live Wallpaper</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-400/40 animate-pulse">
                      Online Auto-Update
                    </span>
                  </div>
                  <p className={`text-[11px] font-normal mt-1 leading-snug ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Automatically retrieves and changes home background periodically using high-resolution online cosmic imagery (Dark mode only).
                  </p>
                </div>
                {themeMode === 'live-wallpaper' && (
                  <div className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center shrink-0 mt-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Live Wallpaper Active Controls Panel */}
              {themeMode === 'live-wallpaper' && (
                <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            wallpaperInfo?.status === 'offline' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                          }`}
                        />
                        <span>
                          {wallpaperInfo?.title || 'Online Live Wallpaper'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Source: {wallpaperInfo?.source || 'Unsplash (Free License)'}
                        {wallpaperInfo?.author ? ` • Photo by ${wallpaperInfo.author}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleManualRefresh}
                      disabled={isRefreshingWallpaper}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-600/30 hover:bg-violet-600/50 border border-violet-400/40 text-violet-200 transition-colors cursor-pointer ${
                        isRefreshingWallpaper ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingWallpaper ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingWallpaper ? 'Updating...' : 'Refresh Now'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <span className="text-slate-300 font-medium">Auto-Refresh Interval:</span>
                    <div className="flex gap-1.5">
                      {[
                        { val: 2.5, label: '2.5s' },
                        { val: 5, label: '5s' },
                        { val: 15, label: '15s' },
                        { val: 30, label: '30s' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setWallpaperInterval(item.val)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                            wallpaperInterval === item.val
                              ? 'bg-violet-600 border-violet-400 text-white'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
