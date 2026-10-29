import React, { useState } from 'react';
import { ShieldCheck, X, Lock, CheckCircle2, Trash2 } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistory?: () => void;
  theme?: 'dark' | 'light';
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  onClearHistory,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [clearing, setClearing] = useState(false);
  const [clearedNotice, setClearedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClear = async () => {
    setClearing(true);
    if (window.adalNexus?.clearCacheAndHistory) {
      const res = await window.adalNexus.clearCacheAndHistory();
      setClearing(false);
      setClearedNotice(
        `Cleared ${res.recordsRemoved} history records and Chromium disk/memory cache. Bookmarks and saved reports preserved.`
      );
      onClearHistory?.();
      setTimeout(() => setClearedNotice(null), 4000);
    } else {
      onClearHistory?.();
      setClearing(false);
      setClearedNotice('Browsing history cleared. Bookmarks and downloads preserved.');
      setTimeout(() => setClearedNotice(null), 4000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all duration-200 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-400/20'
            : 'bg-[#0f1424] border-teal-500/30 text-white shadow-teal-950/50'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="security-modal-title" className="font-bold text-sm tracking-tight">
                AdaL Security &amp; Privacy Shield
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Verified Electron runtime policies &amp; sandbox audits
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/10 text-slate-400'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              isLight ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-teal-950/20 border-teal-500/30 text-teal-200'
            }`}
          >
            <Lock className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="leading-snug text-[11px]">
              Every website view executes in an isolated WebContentsView with strict context isolation and sandboxed permissions.
            </span>
          </div>

          {/* Security Features - Audited and Truthful */}
          <div className="space-y-2.5">
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">Renderer Context Isolation</div>
                <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Websites cannot access Node.js or internal filesystem APIs
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ENFORCED
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">Node.js Integration in Web Content</div>
                <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Node APIs are disabled for all remote website contexts
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ENFORCED
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">Chromium Origin Sandbox</div>
                <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Web content executed inside an unprivileged operating system sandbox
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">Consequential Action Gates</div>
                <div className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  AI agent actions with external impacts require human confirmation
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Scope Explanation before Clear */}
          <div
            className={`p-3 rounded-xl border space-y-1.5 text-[11px] ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white/[0.02] border-white/10 text-slate-300'
            }`}
          >
            <div className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
              <span>Data Retention Policy</span>
            </div>
            <div>• <strong className="text-rose-400">Removes:</strong> Local browsing history entries and Chromium disk/memory web cache.</div>
            <div>• <strong className="text-emerald-400">Preserves:</strong> Bookmarks, downloads list, saved research reports, settings, and API keys.</div>
          </div>

          {/* Quick Clear Action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-200'
              }`}
            >
              {clearing ? (
                <span>Cleaning Cache &amp; History...</span>
              ) : clearedNotice ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>History &amp; Cache Cleared Successfully</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear History &amp; Cache</span>
                </>
              )}
            </button>
            {clearedNotice && (
              <p className="text-[10px] text-emerald-400 text-center mt-2 font-medium">
                {clearedNotice}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
