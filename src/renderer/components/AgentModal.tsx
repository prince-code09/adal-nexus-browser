import React from 'react';
import { Bot, Sparkles, CheckCircle2, Clock, X } from 'lucide-react';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentModal: React.FC<AgentModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f1424] border border-violet-500/40 rounded-2xl shadow-2xl shadow-violet-950/60 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-violet-950/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Bot className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                AdaL Nexus AI Companion
                <span className="text-[10px] font-semibold bg-violet-600/30 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded-full uppercase">
                  Phase 2 Preview
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Autonomous browser planning & agent execution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div className="text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">Browser Engine Active:</span> You are currently running the core AdaL Nexus Chromium desktop browser. In Phase 2, autonomous multi-step web agent automation will connect directly into this browser instance.
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Implementation Roadmap
            </div>

            <div className="flex items-center gap-2.5 text-slate-300 p-2.5 rounded-lg bg-white/[0.03]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Phase 1 (Complete): Real multi-tab desktop browser with Chromium WebContentsView, bookmarks, history, downloads, and custom theme</span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-400 p-2.5 rounded-lg bg-white/[0.03]">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Phase 2 (Upcoming): Autonomous task planning, LLM integration, verification engine, and browser automation</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium rounded-xl transition-all shadow-md shadow-violet-500/30"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
