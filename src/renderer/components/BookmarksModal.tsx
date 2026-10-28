import React, { useState } from 'react';
import { Bookmark, Search, X, Trash2, ExternalLink } from 'lucide-react';
import type { Bookmark as BookmarkItem } from '../../shared/browser-types';

interface BookmarksModalProps {
  isOpen: boolean;
  bookmarks: BookmarkItem[];
  onClose: () => void;
  onOpenBookmark: (url: string) => void;
  onRemoveBookmark: (id: string) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  bookmarks,
  onClose,
  onOpenBookmark,
  onRemoveBookmark,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0f1424] border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Bookmark className="w-5 h-5 text-violet-400" />
            <span>Bookmarks</span>
            <span className="text-xs text-slate-400 font-normal ml-2">
              ({bookmarks.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/5">
          <div className="flex items-center gap-2 bg-[#171e33] border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search saved bookmarks..."
              className="bg-transparent border-none outline-none flex-1 placeholder-slate-500"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
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
                className="group flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-violet-600/15 border border-white/5 hover:border-violet-500/30 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-7 h-7 rounded-lg bg-violet-950/40 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-medium text-white truncate">
                      {item.title || item.url}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
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
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
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
