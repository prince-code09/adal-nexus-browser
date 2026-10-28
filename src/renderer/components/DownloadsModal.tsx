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
}

export const DownloadsModal: React.FC<DownloadsModalProps> = ({
  isOpen,
  downloads,
  onClose,
  onOpenFile,
  onShowInFolder,
  onCancelDownload,
}) => {
  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0f1424] border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-950/50 flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Download className="w-5 h-5 text-violet-400" />
            <span>Downloads</span>
            <span className="text-xs text-slate-400 font-normal ml-2">
              ({downloads.length})
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

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {downloads.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No recent downloads
            </div>
          ) : (
            downloads.map((item) => {
              const isDone = item.state === 'completed';
              const isProgressing = item.state === 'progressing';
              const isFailed = item.state === 'interrupted';
              const isCancelled = item.state === 'cancelled';

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-violet-950/50 border border-violet-500/20 flex items-center justify-center shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isProgressing ? (
                          <Download className="w-4 h-4 text-violet-400 animate-bounce" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-medium text-white truncate">
                          {item.filename}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {formatBytes(item.receivedBytes)}{' '}
                          {item.totalBytes > 0 && `/ ${formatBytes(item.totalBytes)}`}
                          {item.speed && item.speed > 0 ? ` • ${formatBytes(item.speed)}/s` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isDone && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenFile(item.id)}
                            className="px-2 py-1 text-[11px] bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/30 rounded-md transition-colors"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => onShowInFolder(item.id)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            title="Show in folder"
                          >
                            <Folder className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {isProgressing && (
                        <button
                          type="button"
                          onClick={() => onCancelDownload(item.id)}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Cancel download"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isCancelled && (
                        <span className="text-[10px] text-slate-500">Cancelled</span>
                      )}
                      {isFailed && (
                        <span className="text-[10px] text-red-400">Failed</span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar if downloading */}
                  {isProgressing && (
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-200"
                        style={{ width: `${item.percent || 0}%` }}
                      />
                    </div>
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
