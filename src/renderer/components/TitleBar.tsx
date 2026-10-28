import React from 'react';
import { Plus, X, Minus, Square, Globe } from 'lucide-react';
import type { BrowserTab } from '../../shared/browser-types';

interface TitleBarProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  theme?: 'dark' | 'light';
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  theme = 'dark',
}) => {
  const api = window.adalNexus;
  const isLight = theme === 'light';

  const handleMinimize = () => api?.minimize();
  const handleMaximize = () => api?.maximize();
  const handleClose = () => api?.close();

  return (
    <div
      className={`h-10 flex items-center justify-between px-3 select-none z-50 text-xs font-sans transition-colors duration-150 ${
        isLight
          ? 'bg-slate-200/95 border-b border-slate-300 text-slate-800'
          : 'bg-[#090b14] border-b border-purple-950/40 text-white'
      }`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2 mr-3 shrink-0">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <span className="text-[11px] font-black text-white italic">A</span>
        </div>
        <span className={`font-bold tracking-tight text-sm ${isLight ? 'text-slate-900' : 'text-white/90'}`}>
          AdaL <span className="text-violet-500 dark:text-violet-400 font-extrabold">Nexus</span>
        </span>
      </div>

      {/* Tabs Strip */}
      <div
        className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex items-center gap-2 h-7 px-3 rounded-lg max-w-[200px] min-w-[110px] cursor-pointer transition-all duration-150 ${
                isActive
                  ? isLight
                    ? 'bg-white border border-slate-300/80 text-violet-900 shadow-sm font-semibold'
                    : 'bg-violet-950/60 border border-violet-500/50 text-white shadow-md shadow-violet-900/30 font-medium'
                  : isLight
                  ? 'bg-slate-300/60 hover:bg-white/80 text-slate-600 hover:text-slate-900 border border-transparent'
                  : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {/* Tab Icon / Favicon / Spinner */}
              {tab.isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : tab.favicon ? (
                <img
                  src={tab.favicon}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm shrink-0 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Globe className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-violet-500' : isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              )}

              {/* Title */}
              <span className="truncate flex-1 text-[11px]">
                {tab.title || (tab.isNewTab ? 'New Tab' : 'Loading...')}
              </span>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`p-0.5 rounded-md transition-opacity duration-100 ${
                  isActive
                    ? isLight
                      ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-200 opacity-80 hover:opacity-100'
                      : 'text-slate-400 hover:text-white hover:bg-violet-800/40 opacity-80 hover:opacity-100'
                    : isLight
                    ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200 opacity-0 group-hover:opacity-100'
                    : 'text-slate-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100'
                }`}
                title="Close tab (Ctrl+W)"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          type="button"
          onClick={onNewTab}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0 cursor-pointer ${
            isLight
              ? 'bg-slate-300/60 hover:bg-violet-200 text-slate-700 hover:text-violet-800 border border-slate-300/60 hover:border-violet-400'
              : 'bg-white/[0.04] hover:bg-violet-600/30 text-slate-400 hover:text-violet-300 border border-white/[0.05] hover:border-violet-500/40'
          }`}
          title="New tab (Ctrl+T)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Windows Controls (Minimize, Maximize, Close) */}
      <div
        className="flex items-center gap-1 ml-3 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={handleMinimize}
          className={`w-8 h-7 flex items-center justify-center rounded transition-colors ${
            isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/80' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className={`w-8 h-7 flex items-center justify-center rounded transition-colors ${
            isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/80' : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className={`w-8 h-7 flex items-center justify-center rounded transition-colors ${
            isLight ? 'text-slate-600 hover:text-white hover:bg-red-600/90' : 'text-slate-400 hover:text-white hover:bg-red-600/80'
          }`}
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
