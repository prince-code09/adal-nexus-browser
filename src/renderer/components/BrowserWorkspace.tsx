import React from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  UserCheck,
  Bot,
  ExternalLink,
  Laptop,
} from 'lucide-react';

interface BrowserWorkspaceProps {
  currentUrl: string;
  pageTitle: string;
  isControlledByAgent: boolean;
  onToggleTakeover: () => void;
  screenshotUrl?: string | null;
}

export const BrowserWorkspace: React.FC<BrowserWorkspaceProps> = ({
  currentUrl,
  pageTitle,
  isControlledByAgent,
  onToggleTakeover,
  screenshotUrl,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-surface-950 overflow-hidden">
      {/* Browser Navigation Bar */}
      <div className="h-11 bg-surface-900 border-b border-surface-800 flex items-center gap-2 px-3">
        <div className="flex items-center gap-1 text-slate-400">
          <button
            disabled
            className="p-1 rounded hover:bg-surface-800 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Back"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            disabled
            className="p-1 rounded hover:bg-surface-800 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Forward"
          >
            <ArrowRight size={14} />
          </button>
          <button
            className="p-1 rounded hover:bg-surface-800 text-slate-300"
            title="Reload current page"
          >
            <RotateCw size={14} />
          </button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 max-w-2xl flex items-center bg-surface-950 border border-surface-700/70 rounded-md px-2.5 py-1 text-xs">
          <Lock size={12} className="text-emerald-400 mr-1.5 shrink-0" />
          <span className="font-mono text-slate-200 truncate select-text">
            {currentUrl || 'about:blank'}
          </span>
        </div>

        {/* Agent / User Takeover Controls */}
        <div className="ml-auto flex items-center gap-2">
          {isControlledByAgent ? (
            <div className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
              <Bot size={13} className="text-indigo-400 animate-pulse" />
              <span>Agent In Control</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
              <UserCheck size={13} className="text-amber-400" />
              <span>Manual Takeover</span>
            </div>
          )}

          <button
            onClick={onToggleTakeover}
            className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors flex items-center gap-1.5 ${
              isControlledByAgent
                ? 'bg-amber-600/20 border-amber-500/30 text-amber-300 hover:bg-amber-600/30'
                : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30'
            }`}
          >
            <Laptop size={13} />
            {isControlledByAgent ? 'Take Over Browser' : 'Resume Agent Control'}
          </button>
        </div>
      </div>

      {/* Takeover Notice Banner */}
      {!isControlledByAgent && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 text-xs text-amber-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <UserCheck size={14} className="text-amber-400" />
            Browser takeover active — Agent actions are paused while you interact directly.
          </span>
          <button
            onClick={onToggleTakeover}
            className="underline font-semibold hover:text-white"
          >
            Return control to Agent &rarr;
          </button>
        </div>
      )}

      {/* Viewport Canvas / Frame */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto bg-surface-950/80 relative">
        {screenshotUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center max-w-6xl">
            <div className="w-full bg-surface-900 border border-surface-800 rounded-t-lg px-3 py-1.5 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">{pageTitle || currentUrl}</span>
              <span className="font-mono text-[10px] text-slate-500">1280 &times; 800</span>
            </div>
            <img
              src={screenshotUrl}
              alt="Browser Viewport"
              className="w-full max-h-[75vh] object-contain border-x border-b border-surface-800 rounded-b-lg shadow-2xl bg-white"
            />
          </div>
        ) : (
          <div className="text-center p-8 border border-dashed border-surface-800 rounded-xl max-w-md">
            <div className="w-12 h-12 rounded-xl bg-surface-900 border border-surface-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Globe size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">
              Browser Workspace Ready
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              When an autonomous task runs, Playwright opens Chromium with authorized tools.
              Live DOM actions, navigation, and screenshots will stream here.
            </p>
            <div className="mt-4 pt-3 border-t border-surface-800/80 flex items-center justify-center gap-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Playwright Ready
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400" /> CDP Bridge Ready
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
