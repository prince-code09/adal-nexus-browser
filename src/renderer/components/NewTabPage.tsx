import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Zap,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { ShortcutItem } from '../../shared/browser-types';

interface NewTabPageProps {
  shortcuts: ShortcutItem[];
  onNavigate: (urlOrQuery: string) => void;
  onAddShortcutClick: () => void;
  onDeleteShortcut?: (id: string) => void;
  onCustomizeClick: () => void;
  theme?: 'dark' | 'light';
}

export const NewTabPage: React.FC<NewTabPageProps> = ({
  shortcuts,
  onNavigate,
  onAddShortcutClick,
  onDeleteShortcut,
  onCustomizeClick,
  theme = 'dark',
}) => {
  const [query, setQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState('Good Morning!');
  const isLight = theme === 'light';

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
        isLight ? 'bg-slate-50 text-slate-800' : 'bg-[#080b14] text-slate-100'
      }`}
    >
      {/* =========================================================================
          CINEMATIC 3D ATMOSPHERIC BACKGROUND LAYERS
          ========================================================================= */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {isLight ? (
          /* Light Mode Atmospheric Horizon */
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#ede9fe]/40 to-[#f1f5f9]" />
            <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-200/40 via-violet-300/30 to-fuchsia-200/20 blur-3xl" />
            <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-gradient-to-br from-violet-200/40 via-blue-200/20 to-transparent blur-3xl" />
            <div className="absolute bottom-[20%] left-0 right-0 h-48 opacity-10">
              <svg className="w-full h-full object-cover" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path fill="#6366f1" d="M0,192L48,176C96,160,192,128,288,144C384,160,480,224,576,218.7C672,213,768,139,864,122.7C960,107,1056,149,1152,176C1248,203,1344,213,1392,218.7L1440,224L1440,320L0,320Z" />
              </svg>
            </div>
          </>
        ) : (
          /* Dark Mode Deep Cosmic Landscape */
          <>
            {/* Layer 1: Deep Cosmic Gradient Base */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#090b16] via-[#0d1024] to-[#080b14]" />

            {/* Layer 1b: Cinematic Project Wallpaper Image */}
            <img
              src="/cosmic-bg.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />

            {/* Layer 2: Distant Twinkling Stars */}
            <div className="absolute inset-0 opacity-80">
              <div className="absolute top-[12%] left-[18%] w-1 h-1 bg-white rounded-full animate-twinkle-1" />
              <div className="absolute top-[22%] left-[32%] w-1.5 h-1.5 bg-violet-300 rounded-full animate-twinkle-2 shadow-[0_0_8px_#c084fc]" />
              <div className="absolute top-[15%] left-[65%] w-1 h-1 bg-blue-200 rounded-full animate-twinkle-3" />
              <div className="absolute top-[28%] left-[78%] w-1 h-1 bg-fuchsia-200 rounded-full animate-twinkle-1" />
              <div className="absolute top-[8%] left-[82%] w-1.5 h-1.5 bg-white rounded-full animate-twinkle-2 shadow-[0_0_6px_#fff]" />
              <div className="absolute top-[35%] left-[12%] w-1 h-1 bg-purple-300 rounded-full animate-twinkle-3" />
              <div className="absolute top-[18%] left-[48%] w-0.5 h-0.5 bg-white rounded-full animate-twinkle-1" />
              <div className="absolute top-[40%] left-[88%] w-1 h-1 bg-cyan-200 rounded-full animate-twinkle-2" />
            </div>

            {/* Layer 3: Giant Cosmic Ringed Moon / Planet (Top-Right) */}
            <div className="absolute -top-12 -right-16 w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-950 via-purple-900/60 to-violet-600/30 border border-violet-500/20 shadow-[0_0_90px_rgba(139,92,246,0.35)] opacity-85 animate-celestial">
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-black/60 via-purple-950/40 to-transparent backdrop-blur-sm" />
              <div className="absolute top-1/2 left-[-20%] w-[140%] h-[2px] bg-gradient-to-r from-transparent via-violet-400/40 to-transparent -rotate-12 blur-[0.5px]" />
            </div>

            {/* Floating Secondary Purple Celestial Orb */}
            <div className="absolute top-[38%] right-[12%] w-12 h-12 rounded-full bg-gradient-to-tr from-purple-700 to-fuchsia-500 shadow-[0_0_30px_rgba(192,132,252,0.7)] animate-orb-glow animate-celestial-slow opacity-90" />

            {/* Layer 4: Distant Mountain Silhouettes & Atmospheric Fog */}
            <div className="absolute bottom-[28%] left-0 right-0 h-72 opacity-40">
              <svg className="w-full h-full object-cover" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path
                  fill="#0f172a"
                  d="M0,192L48,176C96,160,192,128,288,144C384,160,480,224,576,218.7C672,213,768,139,864,122.7C960,107,1056,149,1152,176C1248,203,1344,213,1392,218.7L1440,224L1440,320L0,320Z"
                />
              </svg>
            </div>

            {/* Closer Jagged Violet Mountains with Rim Lighting */}
            <div className="absolute bottom-[20%] left-0 right-0 h-64 opacity-75">
              <svg className="w-full h-full object-cover" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path
                  fill="#080c18"
                  stroke="#8b5cf6"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  d="M0,224L60,192C120,160,240,96,360,117.3C480,139,600,245,720,250.7C840,256,960,160,1080,138.7C1200,117,1320,171,1380,197.3L1440,224L1440,320L0,320Z"
                />
              </svg>
            </div>

            {/* Layer 5: Glowing Neon Lake Horizon Waves */}
            <div className="absolute bottom-[16%] left-0 right-0 h-16 bg-gradient-to-t from-violet-950/60 via-purple-900/30 to-transparent animate-neon-water blur-md" />
            <div className="absolute bottom-[15%] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-80 blur-[1px] shadow-[0_0_20px_#a855f7]" />

            {/* 3D Floating Glass Bubble Spheres */}
            <div className="absolute bottom-16 -left-8 w-44 h-44 rounded-full bg-gradient-to-tr from-purple-900/40 via-violet-600/20 to-white/20 border border-white/20 backdrop-blur-md shadow-[0_0_40px_rgba(139,92,246,0.3)] animate-celestial" />
            <div className="absolute bottom-20 -right-10 w-52 h-52 rounded-full bg-gradient-to-tl from-purple-900/40 via-fuchsia-600/20 to-white/20 border border-white/20 backdrop-blur-md shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-celestial-slow" />
          </>
        )}
      </div>

      {/* =========================================================================
          TOP HEADER: Live Time, Greeting & Customize Button
          ========================================================================= */}
      <div className="w-full flex justify-end items-center px-8 pt-6 z-10 gap-4">
        <div className="text-right">
          <div className={`text-2xl font-bold tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]'}`}>
            {timeStr || '10:24 AM'}
          </div>
          <div className={`text-xs font-medium ${isLight ? 'text-violet-700' : 'text-violet-300/90 drop-shadow'}`}>
            {greeting}
          </div>
        </div>

        <button
          type="button"
          onClick={onCustomizeClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
            isLight
              ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm'
              : 'bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 border border-white/10 hover:border-violet-400/40 backdrop-blur-md'
          }`}
          title="Customize page and preferences"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Customize</span>
        </button>
      </div>

      {/* =========================================================================
          CENTER SECTION: Hero Brand Logo, Search Bar & Speed Dial Shortcuts
          ========================================================================= */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center px-4 my-auto z-10 text-center">
        {/* Brand Logo & Heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-violet-500/50 mb-3 border border-white/20">
            <span className="text-3xl font-black text-white italic drop-shadow-md">A</span>
          </div>
          <h1 className={`text-4xl font-extrabold tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]'}`}>
            AdaL <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent">Nexus</span>
          </h1>
          <p className={`text-xs mt-1.5 max-w-sm ${isLight ? 'text-slate-600' : 'text-slate-300 drop-shadow'}`}>
            Next-generation autonomous desktop browser
          </p>
        </div>

        {/* Floating Glassmorphism Center Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-xl mb-10">
          <div
            className={`flex items-center h-12 rounded-full px-4 transition-all duration-300 ${
              isLight
                ? 'bg-white/95 hover:bg-white focus-within:bg-white border border-slate-300 focus-within:border-violet-500 shadow-xl shadow-violet-200/50 focus-within:ring-4 focus-within:ring-violet-400/20'
                : 'bg-white/[0.08] hover:bg-white/[0.12] focus-within:bg-[#0d1222] border border-white/20 focus-within:border-violet-500/80 backdrop-blur-2xl shadow-2xl shadow-black/60 focus-within:shadow-[0_0_30px_rgba(139,92,246,0.35)]'
            }`}
          >
            {/* Google Colorful Search Icon */}
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

            {/* Input field */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitSearch();
                }
              }}
              placeholder="Search Google or type a URL"
              className={`flex-1 bg-transparent border-none outline-none text-sm font-sans tracking-wide ${
                isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-slate-400'
              }`}
            />

            {/* Search Button with 3D press effect */}
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                submitSearch();
              }}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 flex items-center justify-center text-white shadow-md shadow-violet-500/50 hover:shadow-violet-500/70 transition-all duration-200 ml-2 cursor-pointer"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Speed Dial Shortcuts with 3D Hover Tilt & Glow */}
        <div className="flex flex-wrap items-center justify-center gap-6 max-w-2xl">
          {shortcuts.map((item) => (
            <div key={item.id} className="group relative flex flex-col items-center">
              <button
                type="button"
                onClick={() => onNavigate(item.url)}
                className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl shadow-lg transition-all duration-300 group-hover:-translate-y-1.5 group-hover:scale-105 group-hover:shadow-[0_12px_25px_-5px_rgba(139,92,246,0.4)] cursor-pointer border ${
                  isLight
                    ? 'bg-white/90 hover:bg-white border-slate-200 hover:border-violet-400 shadow-slate-300/40'
                    : 'bg-white/[0.08] hover:bg-white/[0.18] border-white/20 hover:border-violet-400/80 shadow-black/50'
                }`}
                title={item.title}
              >
                {/* Brand Logos */}
                {item.title.toLowerCase().includes('youtube') ? (
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24">
                      <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
                    </svg>
                  </div>
                ) : item.title.toLowerCase().includes('google') ? (
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border border-slate-200">
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
                ) : item.title.toLowerCase().includes('github') ? (
                  <div className="w-8 h-8 rounded-full bg-[#181717] border border-white/20 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                ) : item.title.toLowerCase().includes('chatgpt') ? (
                  <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                ) : item.title.toLowerCase().includes('notion') ? (
                  <div className="w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center shadow-md">
                    <span className="font-serif font-black text-white text-xs">N</span>
                  </div>
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-md"
                    style={{ backgroundColor: item.bgColor || '#6366f1' }}
                  >
                    {item.title.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              <span className={`mt-2 text-[11px] font-medium max-w-[70px] truncate text-center ${
                isLight ? 'text-slate-700' : 'text-slate-200 drop-shadow'
              }`}>
                {item.title}
              </span>

              {onDeleteShortcut && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteShortcut(item.id);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer"
                  title="Remove shortcut"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add Shortcut Action */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={onAddShortcutClick}
              className={`w-14 h-14 rounded-full border border-dashed flex items-center justify-center backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-105 hover:shadow-[0_12px_25px_-5px_rgba(139,92,246,0.3)] cursor-pointer ${
                isLight
                  ? 'bg-white/80 hover:bg-violet-50 border-slate-300 hover:border-violet-500 text-slate-600 hover:text-violet-700'
                  : 'bg-white/[0.05] hover:bg-violet-600/25 border-white/25 hover:border-violet-400 text-slate-300 hover:text-violet-300'
              }`}
              title="Add Shortcut"
            >
              <Plus className="w-5 h-5" />
            </button>
            <span className={`mt-2 text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-300 drop-shadow'}`}>
              Add Shortcut
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM 4 FEATURE CARDS: Glassmorphism with 3D Elevation
          ========================================================================= */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 px-6 pb-6 z-10">
        {/* Card 1: Fast */}
        <div
          className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 ${
            isLight
              ? 'bg-white/85 hover:bg-white border-slate-200 hover:border-violet-400 shadow-md shadow-slate-200/50 hover:shadow-violet-200/50'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-violet-500/50 backdrop-blur-2xl shadow-xl shadow-black/50 hover:shadow-[0_15px_30px_-5px_rgba(139,92,246,0.3)]'
          }`}
        >
          <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-500 border border-violet-500/30 group-hover:scale-110 transition-transform duration-200">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Fast</div>
            <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Built for speed and productivity
            </div>
          </div>
        </div>

        {/* Card 2: Secure */}
        <div
          className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 ${
            isLight
              ? 'bg-white/85 hover:bg-white border-slate-200 hover:border-teal-400 shadow-md shadow-slate-200/50 hover:shadow-teal-200/50'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-teal-500/50 backdrop-blur-2xl shadow-xl shadow-black/50 hover:shadow-[0_15px_30px_-5px_rgba(20,184,166,0.3)]'
          }`}
        >
          <div className="p-2.5 rounded-xl bg-teal-600/20 text-teal-500 border border-teal-500/30 group-hover:scale-110 transition-transform duration-200">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Secure</div>
            <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Your data stays in your control
            </div>
          </div>
        </div>

        {/* Card 3: Smart */}
        <div
          className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 ${
            isLight
              ? 'bg-white/85 hover:bg-white border-slate-200 hover:border-fuchsia-400 shadow-md shadow-slate-200/50 hover:shadow-fuchsia-200/50'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-fuchsia-500/50 backdrop-blur-2xl shadow-xl shadow-black/50 hover:shadow-[0_15px_30px_-5px_rgba(217,70,239,0.3)]'
          }`}
        >
          <div className="p-2.5 rounded-xl bg-fuchsia-600/20 text-fuchsia-500 border border-fuchsia-500/30 group-hover:scale-110 transition-transform duration-200">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Smart</div>
            <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              AI-powered browsing experience
            </div>
          </div>
        </div>

        {/* Card 4: Customizable */}
        <div
          className={`group flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 ${
            isLight
              ? 'bg-white/85 hover:bg-white border-slate-200 hover:border-indigo-400 shadow-md shadow-slate-200/50 hover:shadow-indigo-200/50'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-indigo-500/50 backdrop-blur-2xl shadow-xl shadow-black/50 hover:shadow-[0_15px_30px_-5px_rgba(99,102,241,0.3)]'
          }`}
        >
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 group-hover:scale-110 transition-transform duration-200">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-sm font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Customizable</div>
            <div className={`text-xs mt-0.5 leading-snug ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Make it yours with themes and shortcuts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
