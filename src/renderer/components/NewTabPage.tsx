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
}

export const NewTabPage: React.FC<NewTabPageProps> = ({
  shortcuts,
  onNavigate,
  onAddShortcutClick,
  onDeleteShortcut,
  onCustomizeClick,
}) => {
  const [query, setQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState('Good Morning!');

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onNavigate(query.trim());
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto no-scrollbar select-none">
      {/* Atmospheric Background Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center -z-10"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(9, 11, 20, 0.4), rgba(9, 11, 20, 0.75)), url('/reference-design.jpg')`,
          filter: 'contrast(1.05) saturate(1.1)',
        }}
      />

      {/* Top Header Bar: Time & Customize */}
      <div className="w-full flex justify-end items-center p-6 z-10 gap-4">
        <div className="text-right">
          <div className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
            {timeStr || '10:24 AM'}
          </div>
          <div className="text-xs text-slate-300 font-medium drop-shadow">
            {greeting}
          </div>
        </div>

        <button
          type="button"
          onClick={onCustomizeClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-violet-600/30 text-xs text-slate-200 hover:text-white border border-white/15 hover:border-violet-500/40 backdrop-blur-md transition-all shadow-lg"
        >
          <Edit2 className="w-3.5 h-3.5 text-violet-400" />
          <span>Customize</span>
        </button>
      </div>

      {/* Main Content: Brand, Search, Shortcuts */}
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center px-4 -mt-6 z-10">
        {/* Title & Tagline */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            AdaL <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 drop-shadow-[0_0_25px_rgba(168,85,247,0.6)]">Nexus</span>
          </h1>
          <p className="mt-2 text-sm text-slate-300 font-medium tracking-wide drop-shadow-md">
            Your Intelligent Browser for a Smarter Web
          </p>
        </div>

        {/* Center Search Input */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl mb-8">
          <div className="relative flex items-center h-12 bg-black/40 hover:bg-black/50 focus-within:bg-black/60 border border-violet-500/40 focus-within:border-violet-400 rounded-full px-4 shadow-[0_0_25px_rgba(139,92,246,0.25)] focus-within:shadow-[0_0_35px_rgba(139,92,246,0.45)] backdrop-blur-xl transition-all duration-300">
            {/* Google Icon */}
            <div className="w-5 h-5 mr-3 shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              placeholder="Search Google or type a URL"
              className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 font-sans tracking-wide"
            />

            <button
              type="submit"
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-violet-500/40 transition-transform hover:scale-105 active:scale-95 ml-2"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Speed Dial Shortcuts */}
        <div className="flex flex-wrap items-center justify-center gap-5 max-w-2xl">
          {shortcuts.map((item) => (
            <div key={item.id} className="group relative flex flex-col items-center">
              <button
                type="button"
                onClick={() => onNavigate(item.url)}
                className="w-13 h-13 rounded-full bg-white/[0.07] hover:bg-white/[0.15] border border-white/20 hover:border-violet-400 flex items-center justify-center backdrop-blur-md shadow-lg shadow-black/40 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-violet-500/20"
                title={item.title}
              >
                {/* Render Brand Logo or Initials */}
                {item.title.toLowerCase().includes('youtube') ? (
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24">
                      <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
                    </svg>
                  </div>
                ) : item.title.toLowerCase().includes('google') ? (
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md">
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

              <span className="mt-1.5 text-[11px] font-medium text-slate-200 drop-shadow max-w-[70px] truncate text-center">
                {item.title}
              </span>

              {/* Optional delete button on hover */}
              {onDeleteShortcut && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteShortcut(item.id);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove shortcut"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add Shortcut Button */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={onAddShortcutClick}
              className="w-13 h-13 rounded-full bg-white/[0.04] hover:bg-violet-600/20 border border-dashed border-white/20 hover:border-violet-400 flex items-center justify-center backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:shadow-violet-500/20 text-slate-300 hover:text-violet-300"
              title="Add Shortcut"
            >
              <Plus className="w-5 h-5" />
            </button>
            <span className="mt-1.5 text-[11px] font-medium text-slate-300 drop-shadow">
              Add Shortcut
            </span>
          </div>
        </div>
      </div>

      {/* Bottom 4 Feature Cards */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 p-6 z-10">
        {/* Card 1: Fast */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/40 backdrop-blur-lg shadow-xl shadow-black/40 transition-all duration-200 hover:-translate-y-1">
          <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Fast</div>
            <div className="text-xs text-slate-400 mt-0.5 leading-snug">
              Built for speed and productivity
            </div>
          </div>
        </div>

        {/* Card 2: Secure */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-teal-500/40 backdrop-blur-lg shadow-xl shadow-black/40 transition-all duration-200 hover:-translate-y-1">
          <div className="p-2.5 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Secure</div>
            <div className="text-xs text-slate-400 mt-0.5 leading-snug">
              Your data stays in your control
            </div>
          </div>
        </div>

        {/* Card 3: Smart */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-fuchsia-500/40 backdrop-blur-lg shadow-xl shadow-black/40 transition-all duration-200 hover:-translate-y-1">
          <div className="p-2.5 rounded-xl bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Smart</div>
            <div className="text-xs text-slate-400 mt-0.5 leading-snug">
              AI-powered browsing experience
            </div>
          </div>
        </div>

        {/* Card 4: Customizable */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-indigo-500/40 backdrop-blur-lg shadow-xl shadow-black/40 transition-all duration-200 hover:-translate-y-1">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Customizable</div>
            <div className="text-xs text-slate-400 mt-0.5 leading-snug">
              Make it yours with themes and shortcuts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
