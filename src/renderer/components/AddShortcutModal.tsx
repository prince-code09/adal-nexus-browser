import React, { useState } from 'react';
import { Plus, X, Globe } from 'lucide-react';
import type { ShortcutItem } from '../../shared/browser-types';

interface AddShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShortcut: (shortcut: Omit<ShortcutItem, 'id'>) => void;
}

export const AddShortcutModal: React.FC<AddShortcutModalProps> = ({
  isOpen,
  onClose,
  onAddShortcut,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [color, setColor] = useState('#8b5cf6');

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
      <div className="w-full max-w-md bg-[#0f1424] border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Plus className="w-5 h-5 text-violet-400" />
            <span>Add Shortcut</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reddit, Twitter"
              required
              className="w-full bg-[#171e33] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">URL</label>
            <div className="flex items-center gap-2 bg-[#171e33] border border-white/10 rounded-xl px-3 py-2 text-white focus-within:border-violet-500 transition-colors">
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="bg-transparent border-none outline-none flex-1 placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Icon Color</label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-violet-500/30 transition-all"
            >
              Add Shortcut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
