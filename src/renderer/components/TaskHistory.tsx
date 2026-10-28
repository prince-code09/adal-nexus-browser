import React from 'react';
import { History, Clock, FileSpreadsheet, ArrowRight } from 'lucide-react';
import type { TaskRecord } from '../../shared/types';
import { VerificationBadge } from './VerificationBadge';

interface TaskHistoryProps {
  tasks: TaskRecord[];
  onSelectTask: (task: TaskRecord) => void;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({ tasks, onSelectTask }) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-surface-950 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <History size={20} className="text-brand-400" />
              Task Execution History
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistent record of all autonomous browser plans, executions, and verification audits.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-surface-900 px-2.5 py-1 rounded-md border border-surface-800">
            {tasks.length} total tasks
          </span>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="p-4 rounded-xl bg-surface-900 border border-surface-800 hover:border-brand-500/50 hover:bg-surface-800/40 cursor-pointer transition-all flex items-center justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <VerificationBadge status={task.verificationStatus} size="sm" />
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {task.id}
                    </span>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock size={11} />
                      {new Date(task.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-xs font-medium text-slate-100 group-hover:text-brand-300 transition-colors truncate">
                    {task.goal}
                  </h3>

                  {task.verificationReport && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-mono">
                      {task.verificationReport}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {task.artifacts && task.artifacts.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <FileSpreadsheet size={12} />
                      {task.artifacts.length} artifact
                    </span>
                  )}
                  <ArrowRight
                    size={16}
                    className="text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500 text-xs">
            <History size={36} className="mx-auto mb-2 opacity-30" />
            <p>No historical task records found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
