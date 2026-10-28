import React from 'react';
import { Bot, Sparkles, CheckCircle2, Clock, X } from 'lucide-react';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const AgentModal: React.FC<AgentModalProps> = ({ isOpen, onClose, theme = 'dark' }) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-400/20'
            : 'bg-[#0f1424] border-violet-500/40 text-white shadow-violet-950/60'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-5 border-b ${
            isLight
              ? 'border-slate-200 bg-gradient-to-r from-violet-50 to-transparent'
              : 'border-white/10 bg-gradient-to-r from-violet-950/40 to-transparent'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-md ${
                isLight
                  ? 'bg-violet-100 border-violet-200 text-violet-700'
                  : 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                AdaL Nexus AI Companion
                <span
                  className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full uppercase ${
                    isLight
                      ? 'bg-violet-100 text-violet-800 border-violet-300'
                      : 'bg-violet-600/30 text-violet-300 border-violet-500/40'
                  }`}
                >
                  Phase 2 Preview
                </span>
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Autonomous browser planning & agent execution
              </p>
            </div>
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

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isLight ? 'bg-violet-50 border-violet-200 text-slate-800' : 'bg-violet-950/30 border-violet-500/30 text-slate-300'
            }`}
          >
            <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-violet-700 dark:text-white">Browser Engine Active:</span> You are currently running the core AdaL Nexus Chromium desktop browser. In Phase 2, autonomous multi-step web agent automation with Gemini LLM task planning and Playwright task execution will connect directly into this browser instance without breaking normal browsing.
            </div>
          </div>

          <div className="space-y-2.5">
            <div className={`font-semibold uppercase tracking-wider text-[11px] ${isLight ? 'text-slate-600' : 'text-white'}`}>
              Implementation Roadmap
            </div>

            <div
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/[0.03] border-white/5 text-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Phase 1 (Complete): Real multi-tab desktop browser with Chromium WebContentsView, bookmarks, history, downloads, and custom theme</span>
            </div>

            <div
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white/[0.03] border-white/5 text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Phase 2 (Upcoming): Autonomous task planning, LLM integration, verification engine, and browser automation</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20'}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium rounded-xl transition-all shadow-md shadow-violet-500/30 cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
