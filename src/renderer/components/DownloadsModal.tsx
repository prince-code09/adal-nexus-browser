import React from 'react';
import { Download, X, Folder, CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import type { DownloadItem } from '../../shared/browser-types';

interface DownloadsModalProps {
  isOpen: boolean;
  downloads: DownloadItem[];
  onClose: () => void;
  onOpenFile: (id: string) => void;
  onShowInFolder: (id: string) => void;
  onCancelDownload: (id: string) => void;
  theme?: 'dark' | 'light';
}

export const DownloadsModal: React.FC<DownloadsModalProps> = ({
  isOpen,
  downloads,
  onClose,
  onOpenFile,
  onShowInFolder,
  onCancelDownload,
  theme = 'dark',
}) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

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
            <Download className="w-5 h-5 text-violet-500" />
            <span>Downloads</span>
            <span className={`text-xs font-normal ml-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              ({downloads.length})
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {downloads.length === 0 ? (
            <div className={`text-center py-12 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
              No recent downloads
            </div>
          ) : (
            downloads.map((item) => {
              const progressPct =
                item.totalBytes > 0
                  ? Math.round((item.receivedBytes / item.totalBytes) * 100)
                  : 0;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex flex-col gap-2 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {item.state === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : item.state === 'cancelled' || item.state === 'interrupted' ? (
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-xs font-medium truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {item.filename}
                        </span>
                        {item.isDangerous && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-500 border border-amber-500/30 font-semibold shrink-0">
                            Executable
                          </span>
                        )}
                        {item.fileMissing && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-semibold shrink-0">
                            Missing
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.state === 'progressing' && (
                        <button
                          type="button"
                          onClick={() => onCancelDownload(item.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Cancel download"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.state === 'completed' && (
                        <>
                          {!item.fileMissing && (
                            <button
                              type="button"
                              onClick={() => onShowInFolder(item.id)}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-white/10'
                              }`}
                              title="Show in folder"
                            >
                              <Folder className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!item.fileMissing ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.isDangerous) {
                                  if (!window.confirm(`Warning: "${item.filename}" is an executable or script file. Are you sure you want to open it?`)) {
                                    return;
                                  }
                                }
                                onOpenFile(item.id);
                              }}
                              className="text-xs text-violet-500 hover:underline font-medium cursor-pointer"
                            >
                              Open
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Deleted</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {item.state === 'progressing' && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-200"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>
                          {formatBytes(item.receivedBytes)} of{' '}
                          {item.totalBytes > 0 ? formatBytes(item.totalBytes) : 'Unknown'}
                        </span>
                        <span>{progressPct}%</span>
                      </div>
                    </div>
                  )}

                  {item.state === 'completed' && (
                    <div className="text-[10px] text-slate-400">
                      {formatBytes(item.totalBytes)} • Completed
                    </div>
                  )}

                  {item.state === 'cancelled' && (
                    <div className="text-[10px] text-red-400">Cancelled</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
