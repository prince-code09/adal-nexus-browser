import React, { useState } from 'react';
import { Plus, X, Globe } from 'lucide-react';
import type { ShortcutItem } from '../../shared/browser-types';

interface AddShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShortcut: (shortcut: Omit<ShortcutItem, 'id'>) => void;
  theme?: 'dark' | 'light';
}

export const AddShortcutModal: React.FC<AddShortcutModalProps> = ({
  isOpen,
  onClose,
  onAddShortcut,
  theme = 'dark',
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    onAddShortcut({
      title: title.trim(),
      url: targetUrl,
      bgColor: color,
    });

    setTitle('');
    setUrl('');
    onClose();
  };

  const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all ${
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
            <Plus className="w-5 h-5 text-violet-500" />
            <span>Add Shortcut</span>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className={`block font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Google, YouTube, Reddit"
              className={`w-full border rounded-xl px-3 py-2 outline-none transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-violet-500'
                  : 'bg-white/[0.04] border-white/10 text-white focus:border-violet-500 placeholder-slate-500'
              }`}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className={`block font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>URL</label>
            <div
              className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-white/[0.04] border-white/10 text-white'
              }`}
            >
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-transparent border-none outline-none flex-1 placeholder-slate-400"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className={`block font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Accent Color</label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-violet-500/30 transition-all cursor-pointer"
            >
              Add Shortcut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
