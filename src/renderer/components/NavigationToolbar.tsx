import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Home,
  Star,
  Download,
  Bot,
  User,
} from 'lucide-react';
import type { BrowserTab } from '../../shared/browser-types';

interface NavigationToolbarProps {
  activeTab: BrowserTab | null;
  isBookmarked: boolean;
  activeDownloadsCount: number;
  onNavigate: (urlOrQuery: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onStop: () => void;
  onGoHome: () => void;
  onToggleBookmark: () => void;
  onToggleDownloads: () => void;
  onOpenAgentModal: () => void;
  onOpenSettings: () => void;
}

export const NavigationToolbar: React.FC<NavigationToolbarProps> = ({
  activeTab,
  isBookmarked,
  activeDownloadsCount,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  onStop,
  onGoHome,
  onToggleBookmark,
  onToggleDownloads,
  onOpenAgentModal,
  onOpenSettings,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync address input when active tab changes or navigates
  useEffect(() => {
    if (!isEditing && activeTab) {
      if (activeTab.isNewTab || activeTab.url === 'adal://newtab') {
        setInputVal('');
      } else {
        setInputVal(activeTab.url);
      }
    }
  }, [activeTab?.url, activeTab?.isNewTab, isEditing]);

  // Global Ctrl+L shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      setIsEditing(false);
      const trimmed = inputVal.trim();
      if (trimmed) {
        onNavigate(trimmed);
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      if (activeTab && !activeTab.isNewTab) {
        setInputVal(activeTab.url);
      } else {
        setInputVal('');
      }
      e.currentTarget.blur();
    }
  };

  return (
    <div className="h-11 bg-[#0b0e1b] border-b border-white/[0.06] flex items-center gap-2 px-3 select-none text-slate-300">
      {/* Navigation Buttons: Back, Forward, Reload/Stop, Home */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onGoBack}
          disabled={!activeTab?.canGoBack}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
            activeTab?.canGoBack
              ? 'hover:bg-white/10 text-slate-200 cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Click to go back (Alt+Left)"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onGoForward}
          disabled={!activeTab?.canGoForward}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
            activeTab?.canGoForward
              ? 'hover:bg-white/10 text-slate-200 cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Click to go forward (Alt+Right)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={activeTab?.isLoading ? onStop : onReload}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          title={activeTab?.isLoading ? 'Stop loading' : 'Reload page (Ctrl+R)'}
        >
          {activeTab?.isLoading ? (
            <X className="w-4 h-4 text-violet-400" />
          ) : (
            <RotateCw className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onGoHome}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          title="Open home page"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* Pill Address Bar */}
      <div className="flex-1 max-w-4xl mx-auto flex items-center h-8 bg-[#131828]/80 hover:bg-[#151c2e] focus-within:bg-[#161d33] border border-violet-500/30 focus-within:border-violet-500 rounded-full px-3 transition-all duration-200 shadow-sm focus-within:shadow-[0_0_15px_rgba(139,92,246,0.25)]">
        {/* Search / Google Icon */}
        <div className="w-4 h-4 mr-2 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onFocus={() => {
            setIsEditing(true);
            inputRef.current?.select();
          }}
          onBlur={() => setIsEditing(false)}
          onKeyDown={handleKeyDown}
          placeholder="Search Google or type a URL"
          className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 font-sans tracking-wide"
        />

        {/* Bookmark Star Toggle */}
        <button
          type="button"
          onClick={onToggleBookmark}
          className="p-1 rounded-full hover:bg-white/10 transition-colors ml-1"
          title={isBookmarked ? 'Remove bookmark (Ctrl+D)' : 'Bookmark this tab (Ctrl+D)'}
        >
          <Star
            className={`w-3.5 h-3.5 transition-colors ${
              isBookmarked
                ? 'text-violet-400 fill-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          />
        </button>
      </div>

      {/* Right Toolbar Actions: Downloads, AI Agent, User Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Downloads */}
        <button
          type="button"
          onClick={onToggleDownloads}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          title="Downloads (Ctrl+J)"
        >
          <Download className="w-4 h-4" />
          {activeDownloadsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-400 ring-2 ring-[#0b0e1b] animate-pulse" />
          )}
        </button>

        {/* AI Agent badge button */}
        <button
          type="button"
          onClick={onOpenAgentModal}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 border border-violet-500/40 hover:border-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.3)] transition-all"
          title="AdaL Nexus AI Companion"
        >
          <Bot className="w-4 h-4 text-violet-300" />
        </button>

        {/* Settings / User profile */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition-colors"
          title="Settings & Preferences"
        >
          <User className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
