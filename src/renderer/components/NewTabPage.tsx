import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Zap,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { ShortcutItem, ThemeMode, WallpaperInfo } from '../../shared/browser-types';
import cosmicCleanBg from '../assets/cosmic-clean-bg.jpg';

interface NewTabPageProps {
  shortcuts: ShortcutItem[];
  onNavigate: (urlOrQuery: string) => void;
  onAddShortcutClick: () => void;
  onDeleteShortcut?: (id: string) => void;
  onCustomizeClick: () => void;
  onOpenFast?: () => void;
  onOpenSecure?: () => void;
  onOpenSmart?: () => void;
  theme?: 'dark' | 'light';
  backgroundMode?: 'cosmic' | 'white' | 'live' | 'wallpaper';
  themeMode?: ThemeMode;
}

export const NewTabPage: React.FC<NewTabPageProps> = ({
  shortcuts,
  onNavigate,
  onAddShortcutClick,
  onDeleteShortcut,
  onCustomizeClick,
  onOpenFast,
  onOpenSecure,
  onOpenSmart,
  theme = 'dark',
  backgroundMode = 'cosmic',
  themeMode,
}) => {
  const [query, setQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState('Good Morning!');
  const [wallpaper, setWallpaper] = useState<WallpaperInfo | null>(null);
  const [isRefreshingWallpaper, setIsRefreshingWallpaper] = useState(false);

  const effectiveMode: ThemeMode =
    themeMode ||
    (backgroundMode === 'live'
      ? 'live-wallpaper'
      : theme === 'light' || backgroundMode === 'white'
      ? 'soft-light'
      : 'dark-cosmic');

  const isWhiteMode = effectiveMode === 'soft-light' || backgroundMode === 'white';
  const isSoftLight = isWhiteMode;
  const isLiveMode = effectiveMode === 'live-wallpaper' || backgroundMode === 'live';
  const isLight = isSoftLight;

  // Live time and greeting calculation
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );

      const hours = now.getHours();
      if (hours < 12) {
        setGreeting('Good Morning! ☀️');
      } else if (hours < 18) {
        setGreeting('Good Afternoon! ☀️');
      } else {
        setGreeting('Good Evening! 🌙');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current live wallpaper when in live mode & listen for updates
  useEffect(() => {
    if (!isLiveMode) return;

    if (window.adalNexus?.getLiveWallpaper) {
      window.adalNexus.getLiveWallpaper().then((info) => {
        if (info) setWallpaper(info);
      });
    }

    const unsub = window.adalNexus?.onLiveWallpaperUpdated?.((info) => {
      setWallpaper(info);
      setIsRefreshingWallpaper(false);
    });

    return () => {
      unsub?.();
    };
  }, [isLiveMode]);

  const handleRefreshLiveWallpaper = async () => {
    if (isRefreshingWallpaper) return;
    setIsRefreshingWallpaper(true);
    try {
      if (window.adalNexus?.refreshLiveWallpaper) {
        const updated = await window.adalNexus.refreshLiveWallpaper();
        if (updated) setWallpaper(updated);
      }
    } catch (err) {
      console.warn('[NewTabPage] Failed to refresh live wallpaper:', err);
    } finally {
      setIsRefreshingWallpaper(false);
    }
  };

  const submitSearch = () => {
    const trimmed = query.trim();
    if (trimmed) {
      onNavigate(trimmed);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch();
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar select-none transition-colors duration-200 ${
        isSoftLight
          ? 'bg-gradient-to-b from-[#f8fafc] via-[#f5f3ff] to-[#f1f5f9] text-slate-800'
          : 'text-slate-100'
      }`}
    >
      {/* =========================================================================
          BACKGROUND LAYERS: Soft Light vs Dark Cosmic 3D vs Online Live Wallpaper
          Notice: z-0 keeps it visible in front of container, behind z-10 content.
          No screenshot or reference mockup with UI elements is rendered here.
          ========================================================================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {isSoftLight ? (
          /* Option 2: Soft Light — Calm, Refined Soft White / Pastel Canvas with Ambient Blooms */
          <>
            <div className="absolute inset-0 bg-white" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f5f3ff] to-[#f1f5f9]" />
            <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />
            <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-indigo-200/35 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 right-1/4 w-80 h-80 rounded-full bg-fuchsia-200/25 blur-3xl pointer-events-none" />
          </>
        ) : isLiveMode ? (
          /* Option 3: Online Live Wallpaper — Auto-Rotated High-Res Imagery with Smooth Cross-fade */
          <>
            <img
              src={wallpaper?.dataUri || wallpaper?.url || cosmicCleanBg}
              alt="AdaL Nexus Live Wallpaper"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none brightness-[0.92] contrast-[1.05] saturate-[1.05] transition-opacity duration-700 ease-in-out"
            />
            {/* Tasteful Dark Overlays for Text Legibility without hiding scenery */}
            <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-transparent to-black/45 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/10 via-transparent to-violet-600/15 pointer-events-none" />
          </>
        ) : (
          /* Option 1: Dark Cosmic 3D (Default) — Pure Scenery, Slightly Darker, Not Black */
          <>
            {/* Pure Scenery Cosmic Landscape (Zero UI chrome, no buttons, clean mountains, planets & lake) */}
            <img
              src={cosmicCleanBg}
              alt="AdaL Nexus Cosmic Scenery"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none brightness-[0.90] contrast-[1.05] saturate-[1.05]"
            />

            {/* Tasteful Atmospheric Dark Overlays for Text Legibility */}
            <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-transparent to-black/40 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/10 via-transparent to-violet-600/10 pointer-events-none" />

            {/* Subtle Starlight Depth */}
            <div className="absolute inset-0 pointer-events-none opacity-80">
              <div className="absolute top-[12%] left-[18%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_#fff]" />
              <div className="absolute top-[22%] left-[32%] w-2 h-2 bg-violet-200 rounded-full shadow-[0_0_8px_#c084fc]" />
              <div className="absolute top-[15%] left-[65%] w-1.5 h-1.5 bg-blue-100 rounded-full shadow-[0_0_6px_#93c5fd]" />
              <div className="absolute top-[28%] left-[78%] w-2 h-2 bg-fuchsia-200 rounded-full shadow-[0_0_8px_#f5d0fe]" />
              <div className="absolute top-[8%] left-[82%] w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff]" />
            </div>
          </>
        )}
      </div>

      {/* =========================================================================
          TOP HEADER: Live Wallpaper Status, Time, Greeting & Customize Button
          ========================================================================= */}
      <div className="w-full flex justify-between items-center px-8 pt-6 relative z-10 gap-4">
        {/* Left: Online Live Wallpaper Status Badge (Dark mode only) */}
        <div>
          {isLiveMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-black/40 border border-white/15 text-slate-200 backdrop-blur-md shadow-md">
              <span
                className={`w-2 h-2 rounded-full ${
                  wallpaper?.status === 'offline' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="truncate max-w-[200px]" title={wallpaper?.title || 'Online Live Wallpaper'}>
                {wallpaper?.title || 'Online Live Wallpaper'}
              </span>
              <button
                type="button"
                onClick={handleRefreshLiveWallpaper}
                disabled={isRefreshingWallpaper}
                className={`p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-slate-300 hover:text-white ${
                  isRefreshingWallpaper ? 'animate-spin text-violet-400' : ''
                }`}
                title="Fetch next online wallpaper now"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Clock & Greeting */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div
              className={`text-2xl font-bold tracking-tight font-sans ${
                isLight ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]'
              }`}
            >
              {timeStr || '10:24 AM'}
            </div>
            <div className={`text-xs font-medium ${isLight ? 'text-violet-700' : 'text-violet-300/90 drop-shadow'}`}>
              {greeting}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CENTER SECTION: Hero Brand Logo, Search Bar & Speed Dial Shortcuts
          ========================================================================= */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center px-4 my-auto relative z-10 text-center">
        {/* Brand Logo & Heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-xl mb-3 border border-white/20">
            <span className="text-3xl font-black text-white italic drop-shadow-md">A</span>
          </div>
          <h1
            className={`text-4xl font-extrabold tracking-tight font-sans ${
              isLight ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]'
            }`}
          >
            AdaL{' '}
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent">
              Nexus
            </span>
          </h1>
          <p className={`text-xs mt-1.5 max-w-sm ${isLight ? 'text-slate-600' : 'text-slate-200 drop-shadow'}`}>
            Your Intelligent Browser for a Smarter Web
          </p>
        </div>

        {/* Center Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-xl mb-10">
          <div
            className={`flex items-center h-12 rounded-full px-4 transition-all duration-200 ${
              isLight
                ? 'bg-white hover:bg-white focus-within:bg-white border border-slate-300/80 focus-within:border-violet-500 shadow-sm focus-within:ring-2 focus-within:ring-violet-400/20'
                : 'bg-black/35 hover:bg-black/45 focus-within:bg-[#0c1020]/90 border border-white/20 focus-within:border-violet-400/80 backdrop-blur-2xl shadow-xl focus-within:ring-2 focus-within:ring-violet-500/30'
            }`}
          >
            {/* Google Search Icon */}
            <div className="w-5 h-5 mr-3 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Google or type a URL..."
              className={`w-full bg-transparent border-none outline-none text-sm placeholder:text-xs ${
                isLight ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-slate-400'
              }`}
            />

            <button
              type="submit"
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-slate-300'
              }`}
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Speed Dial Shortcuts Grid */}
        <div className="flex flex-wrap justify-center gap-6 max-w-xl">
          {shortcuts.map((shortcut) => {
            const firstLetter = shortcut.title ? shortcut.title.charAt(0).toUpperCase() : '?';

            return (
              <div key={shortcut.id} className="group relative flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onNavigate(shortcut.url)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150 ease-out hover:-translate-y-1 hover:shadow-md cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 shadow-sm'
                      : 'bg-black/35 hover:bg-black/50 border border-white/20 text-white shadow-lg backdrop-blur-xl'
                  }`}
                  title={shortcut.title}
                >
                  {shortcut.favicon ? (
                    <img
                      src={shortcut.favicon}
                      alt={shortcut.title}
                      className="w-7 h-7 object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base shadow-sm text-white"
                      style={{ backgroundColor: shortcut.bgColor || '#6366f1' }}
                    >
                      {firstLetter}
                    </div>
                  )}
                </button>

                {onDeleteShortcut && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteShortcut(shortcut.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-md cursor-pointer z-20"
                    title="Remove shortcut"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                <span
                  className={`mt-2 text-[11px] font-medium truncate max-w-[70px] ${
                    isLight ? 'text-slate-600' : 'text-slate-200 drop-shadow'
                  }`}
                >
                  {shortcut.title}
                </span>
              </div>
            );
          })}

          {/* Add Shortcut Tile */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={onAddShortcutClick}
              className={`w-14 h-14 rounded-2xl border border-dashed flex items-center justify-center transition-all duration-150 ease-out hover:-translate-y-1 cursor-pointer ${
                isLight
                  ? 'bg-white/80 hover:bg-violet-50 border-slate-300 hover:border-violet-400 text-slate-600 hover:text-violet-700'
                  : 'bg-black/25 hover:bg-violet-600/30 border-white/30 hover:border-violet-400 text-slate-300 hover:text-violet-200 backdrop-blur-md'
              }`}
              title="Add Shortcut"
            >
              <Plus className="w-5 h-5" />
            </button>
            <span className={`mt-2 text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-200 drop-shadow'}`}>
              Add Shortcut
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM 4 FEATURE CARDS: Clean Standard Elevation & Tasteful Focus
          ========================================================================= */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 px-6 pb-6 relative z-10">
        {/* Card 1: Fast */}
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenFast}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenFast?.();
            }
          }}
          className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-150 ease-out cursor-pointer select-none hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
            isLight
              ? 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-violet-300 shadow-sm hover:shadow-md'
              : 'bg-black/35 hover:bg-black/50 border-white/15 hover:border-violet-400/60 backdrop-blur-xl shadow-xl hover:shadow-2xl'
          }`}
          title="View Engine Performance and Telemetry"
        >
          <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 transition-all duration-150 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Fast</div>
            <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Built for speed and productivity
            </div>
          </div>
        </div>

        {/* Card 2: Secure */}
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenSecure}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenSecure?.();
            }
          }}
          className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-150 ease-out cursor-pointer select-none hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
            isLight
              ? 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-teal-300 shadow-sm hover:shadow-md'
              : 'bg-black/35 hover:bg-black/50 border-white/15 hover:border-teal-400/60 backdrop-blur-xl shadow-xl hover:shadow-2xl'
          }`}
          title="View Privacy and Sandboxing Protections"
        >
          <div className="p-2.5 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 transition-all duration-150 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Secure</div>
            <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Your data stays in your control
            </div>
          </div>
        </div>

        {/* Card 3: Smart */}
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenSmart}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenSmart?.();
            }
          }}
          className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-150 ease-out cursor-pointer select-none hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 ${
            isLight
              ? 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-fuchsia-300 shadow-sm hover:shadow-md'
              : 'bg-black/35 hover:bg-black/50 border-white/15 hover:border-fuchsia-400/60 backdrop-blur-xl shadow-xl hover:shadow-2xl'
          }`}
          title="Open AdaL Autonomous AI Agent"
        >
          <div className="p-2.5 rounded-xl bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 transition-all duration-150 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Smart</div>
            <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              AI-powered browsing experience
            </div>
          </div>
        </div>

        {/* Card 4: Customizable */}
        <div
          role="button"
          tabIndex={0}
          onClick={onCustomizeClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCustomizeClick();
            }
          }}
          className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-150 ease-out cursor-pointer select-none hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
            isLight
              ? 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-md'
              : 'bg-black/35 hover:bg-black/50 border-white/15 hover:border-indigo-400/60 backdrop-blur-xl shadow-xl hover:shadow-2xl'
          }`}
          title="Customize Theme, Search &amp; Settings"
        >
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 transition-all duration-150 shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Customizable</div>
            <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Make it yours with themes and shortcuts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
