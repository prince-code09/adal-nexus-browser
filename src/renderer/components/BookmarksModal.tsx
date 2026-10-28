import React, { useState } from 'react';
import { Bookmark, Search, X, Trash2, ExternalLink } from 'lucide-react';
import type { Bookmark as BookmarkItem } from '../../shared/browser-types';

interface BookmarksModalProps {
  isOpen: boolean;
  bookmarks: BookmarkItem[];
  onClose: () => void;
  onOpenBookmark: (url: string) => void;
  onRemoveBookmark: (id: string) => void;
  theme?: 'dark' | 'light';
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  bookmarks,
  onClose,
  onOpenBookmark,
  onRemoveBookmark,
  theme = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const filtered = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden border transition-all ${
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
            <Bookmark className="w-5 h-5 text-violet-500" />
            <span>Bookmarks</span>
            <span className={`text-xs font-normal ml-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ({bookmarks.length})
            </span>
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

        {/* Search */}
        <div className={`p-3 border-b ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
          <div
            className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-xs ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-[#171e33] border-white/10 text-white'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search saved bookmarks..."
              className="bg-transparent border-none outline-none flex-1 placeholder-slate-400"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {filtered.length === 0 ? (
            <div className={`text-center py-12 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              No bookmarks found
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onOpenBookmark(item.url);
                  onClose();
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isLight
                    ? 'bg-slate-50 hover:bg-violet-50 border-slate-200 hover:border-violet-300'
                    : 'bg-white/[0.03] hover:bg-violet-600/15 border-white/5 hover:border-violet-500/30'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                      isLight ? 'bg-violet-100 border-violet-200 text-violet-600' : 'bg-violet-950/40 border-violet-500/20 text-violet-400'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <div className={`text-xs font-medium truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {item.title || item.url}
                    </div>
                    <div className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {item.url}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBookmark(item.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Delete bookmark"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
