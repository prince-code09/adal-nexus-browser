import React from 'react';
import { Compass, Settings as SettingsIcon, ShieldCheck, Activity } from 'lucide-react';
import type { TaskStatus } from '../../shared/types';

interface TopBarProps {
  currentStatus: TaskStatus;
  activeTab: string;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ currentStatus, onOpenSettings }) => {
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'executing':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse';
      case 'planning':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 animate-pulse';
      case 'verifying':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse';
      case 'waiting_approval':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-bounce';
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'failed':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'cancelled':
        return 'bg-slate-700/40 text-slate-400 border-slate-600/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700/50';
    }
  };

  return (
    <header className="h-11 bg-surface-900 border-b border-surface-800 flex items-center justify-between px-3 select-none app-drag-region">
      {/* Brand & Principle */}
      <div className="flex items-center gap-3 no-drag">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-sm">
            <Compass size={16} className="text-white" />
          </div>
          <span className="font-semibold tracking-tight text-sm text-slate-100">
            AdaL Nexus
          </span>
        </div>

        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-slate-400 border border-surface-700 flex items-center gap-1 font-mono">
          <ShieldCheck size={12} className="text-indigo-400" />
          Plans &bull; Executes &bull; Verifies
        </span>
      </div>

      {/* Center status pill */}
      <div className="flex items-center gap-2 no-drag">
        <div className={`px-2.5 py-0.5 rounded-full text-xs font-mono border flex items-center gap-1.5 ${getStatusColor(currentStatus)}`}>
          <Activity size={12} />
          <span className="uppercase text-[11px] font-semibold">{currentStatus.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 no-drag">
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-surface-800 transition-colors"
          title="Settings & API Keys"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
    </header>
  );
};
