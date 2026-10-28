import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  StopCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Terminal,
  ListOrdered,
  AlertTriangle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import type {
  ExecutionPlan,
  PlanStep,
  ActionLogItem,
  ApprovalRequest,
  TaskStatus,
  VerificationStatus,
} from '../../shared/types';
import { VerificationBadge } from './VerificationBadge';

interface CompanionPanelProps {
  currentGoal: string;
  onStartTask: (goal: string) => void;
  onCancelTask: () => void;
  taskStatus: TaskStatus;
  verificationStatus: VerificationStatus;
  plan: ExecutionPlan | null;
  logs: ActionLogItem[];
  pendingApproval: ApprovalRequest | null;
  onApprovalResponse: (requestId: string, approved: boolean) => void;
}

export const CompanionPanel: React.FC<CompanionPanelProps> = ({
  currentGoal,
  onStartTask,
  onCancelTask,
  taskStatus,
  verificationStatus,
  plan,
  logs,
  pendingApproval,
  onApprovalResponse,
}) => {
  const [goalInput, setGoalInput] = useState('');
  const [activeTab, setActiveTab] = useState<'plan' | 'logs'>('plan');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim() || isBusy) return;
    onStartTask(goalInput.trim());
  };

  const isBusy = taskStatus === 'planning' || taskStatus === 'executing' || taskStatus === 'verifying';

  const demoWorkflowPrompt =
    'Research five AI startups, collect their names, products and pricing, create a CSV file, and verify the saved result.';

  const getStepIcon = (stepStatus: PlanStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle size={15} className="text-emerald-400 shrink-0" />;
      case 'in_progress':
        return <Loader2 size={15} className="text-blue-400 animate-spin shrink-0" />;
      case 'failed':
        return <AlertCircle size={15} className="text-rose-400 shrink-0" />;
      case 'skipped':
        return <HelpCircle size={15} className="text-slate-500 shrink-0" />;
      default:
        return <Clock size={15} className="text-slate-500 shrink-0" />;
    }
  };

  return (
    <aside className="w-96 flex flex-col h-full bg-surface-900 border-r border-surface-800">
      {/* Panel Header */}
      <div className="p-3 border-b border-surface-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Agent Companion
          </span>
        </div>
        <VerificationBadge status={verificationStatus} size="sm" />
      </div>

      {/* Natural Language Task Input */}
      <div className="p-3 border-b border-surface-800 bg-surface-950/40">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Autonomous Task Prompt
          </label>
          <div className="relative">
            <textarea
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="e.g. Research five AI startups and compile verified CSV..."
              rows={3}
              disabled={isBusy}
              className="w-full text-xs p-2.5 rounded-lg bg-surface-900 border border-surface-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none transition-all disabled:opacity-60"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setGoalInput(demoWorkflowPrompt)}
              className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors underline-offset-2 hover:underline truncate"
              title="Click to load end-to-end research workflow prompt"
            >
              Load Demo Workflow Prompt
            </button>

            {isBusy ? (
              <button
                type="button"
                onClick={onCancelTask}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
              >
                <StopCircle size={14} />
                Cancel
              </button>
            ) : (
              <button
                type="submit"
                disabled={!goalInput.trim()}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Send size={13} />
                Run Agent
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Consequential Action Approval Prompt (Alert Banner) */}
      {pendingApproval && (
        <div className="p-3 m-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-pulse">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Approval Required
              </span>
              <p className="text-xs text-amber-200 mt-1 font-medium">{pendingApproval.title}</p>
              <p className="text-[11px] text-amber-300/80 mt-1">{pendingApproval.description}</p>
              {pendingApproval.consequences.length > 0 && (
                <ul className="text-[10px] text-amber-300/70 list-disc list-inside mt-1">
                  {pendingApproval.consequences.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={() => onApprovalResponse(pendingApproval.id, true)}
                  className="px-2.5 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                  Approve Action
                </button>
                <button
                  onClick={() => onApprovalResponse(pendingApproval.id, false)}
                  className="px-2.5 py-1 text-xs rounded bg-surface-800 hover:bg-surface-700 text-slate-300 font-medium border border-surface-600 transition-colors"
                >
                  Reject &amp; Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Plan vs Action Log */}
      <div className="flex border-b border-surface-800 bg-surface-950/20">
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'plan'
              ? 'border-brand-500 text-brand-400 bg-surface-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <ListOrdered size={14} />
          Execution Plan {plan ? `(${plan.steps.length})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-brand-500 text-brand-400 bg-surface-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Terminal size={14} />
          Live Action Log {logs.length > 0 ? `(${logs.length})` : ''}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'plan' ? (
          <div>
            {plan ? (
              <div className="space-y-2">
                <div className="p-2 rounded bg-surface-950/60 border border-surface-800 text-[11px] text-slate-400 mb-3">
                  <span className="font-semibold text-slate-300">Goal:</span> {plan.goal}
                  {plan.summary && (
                    <div className="mt-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Plan Summary:</span> {plan.summary}
                    </div>
                  )}
                </div>

                {plan.steps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-2.5 rounded-lg border text-xs transition-all ${
                      step.status === 'in_progress'
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-200'
                        : step.status === 'completed'
                        ? 'bg-surface-950/40 border-emerald-500/30 text-slate-300'
                        : step.status === 'failed'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : 'bg-surface-950/20 border-surface-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {getStepIcon(step.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-200">
                            {step.order}. {step.description}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                          <span className="bg-surface-800 px-1.5 py-0.5 rounded text-indigo-300">
                            {step.tool}
                          </span>
                          {step.requiresApproval && (
                            <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                              Requires Approval
                            </span>
                          )}
                        </div>
                        {step.result && (
                          <p className="mt-1.5 text-[10px] text-emerald-300/90 font-mono bg-emerald-950/30 p-1 rounded border border-emerald-900/50">
                            &gt; {step.result}
                          </p>
                        )}
                        {step.error && (
                          <p className="mt-1.5 text-[10px] text-rose-300 font-mono bg-rose-950/30 p-1 rounded border border-rose-900/50">
                            ! {step.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4 text-slate-500 text-xs">
                <ListOrdered size={32} className="mx-auto mb-2 opacity-30" />
                <p>No active execution plan.</p>
                <p className="text-[11px] mt-1 text-slate-600">
                  Enter a task prompt above to generate a verified action plan.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="font-mono text-[11px] space-y-1.5">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded leading-relaxed border ${
                    log.level === 'error'
                      ? 'bg-rose-950/20 text-rose-300 border-rose-900/40'
                      : log.level === 'warn'
                      ? 'bg-amber-950/20 text-amber-300 border-amber-900/40'
                      : log.level === 'success'
                      ? 'bg-emerald-950/20 text-emerald-300 border-emerald-900/40'
                      : log.level === 'action'
                      ? 'bg-blue-950/20 text-blue-300 border-blue-900/40'
                      : 'bg-surface-950/40 text-slate-300 border-surface-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="uppercase font-semibold">[{log.level}]</span>
                    {log.tool && <span className="text-indigo-400">({log.tool})</span>}
                  </div>
                  <div className="font-medium mt-0.5">{log.title}</div>
                  {log.details && (
                    <div className="text-slate-400 text-[10px] mt-0.5 break-words whitespace-pre-wrap">
                      {log.details}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs font-sans">
                <Terminal size={32} className="mx-auto mb-2 opacity-30" />
                <p>Action log is empty.</p>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </aside>
  );
};
