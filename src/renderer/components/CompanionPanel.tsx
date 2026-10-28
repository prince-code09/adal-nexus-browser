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
  X,
  FileSpreadsheet,
  FolderOpen,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import type {
  ExecutionPlan,
  PlanStep,
  ActionLogItem,
  ApprovalRequest,
  TaskStatus,
  VerificationStatus,
  ArtifactItem,
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
  artifacts?: ArtifactItem[];
  onOpenArtifact?: (path: string) => void;
  onClose?: () => void;
  theme?: 'dark' | 'light';
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
  artifacts = [],
  onOpenArtifact,
  onClose,
  theme = 'dark',
}) => {
  const [goalInput, setGoalInput] = useState(currentGoal || '');
  const [activeTab, setActiveTab] = useState<'plan' | 'logs' | 'artifacts'>('plan');
  const logEndRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    if (activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  // When artifacts arrive or task finishes with artifacts, notify or suggest
  useEffect(() => {
    if (artifacts.length > 0 && taskStatus === 'completed') {
      setActiveTab('artifacts');
    }
  }, [artifacts.length, taskStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim() || isBusy) return;
    onStartTask(goalInput.trim());
    setActiveTab('plan');
  };

  const isBusy =
    taskStatus === 'planning' ||
    taskStatus === 'executing' ||
    taskStatus === 'verifying' ||
    taskStatus === 'waiting_approval';

  const demoWorkflowPrompt =
    'Research five AI startups, collect their names, products and pricing, create a CSV file, and verify the saved result.';

  const getStepIcon = (stepStatus: PlanStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle size={15} className="text-emerald-500 shrink-0" />;
      case 'in_progress':
        return <Loader2 size={15} className="text-violet-500 animate-spin shrink-0" />;
      case 'failed':
        return <AlertCircle size={15} className="text-rose-500 shrink-0" />;
      case 'skipped':
        return <HelpCircle size={15} className="text-slate-400 shrink-0" />;
      default:
        return <Clock size={15} className="text-slate-400 shrink-0" />;
    }
  };

  return (
    <aside
      className={`w-96 flex flex-col h-full border-l shadow-2xl transition-all duration-150 select-none ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#0b0f19] border-violet-950/40 text-slate-100 shadow-[0_0_30px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* Panel Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between ${
          isLight
            ? 'border-slate-200 bg-gradient-to-r from-violet-50/60 to-transparent'
            : 'border-white/10 bg-gradient-to-r from-violet-950/30 to-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
              isLight
                ? 'bg-violet-100 border-violet-200 text-violet-700'
                : 'bg-violet-600/20 border-violet-500/40 text-violet-300'
            }`}
          >
            <Bot size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight">AdaL Agent</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-violet-600/20 text-violet-400 border border-violet-500/30">
                Playwright + Gemini
              </span>
            </div>
            <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Autonomous background research
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VerificationBadge status={verificationStatus} size="sm" />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title="Close Agent Panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Task Input Area */}
      <div
        className={`p-3 border-b ${
          isLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-black/20'
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              Research &amp; Automation Goal
            </label>
            {isBusy && (
              <span className="flex items-center gap-1 text-[10px] text-violet-400 font-medium animate-pulse">
                <Loader2 size={11} className="animate-spin" />
                {taskStatus === 'planning'
                  ? 'Planning with Gemini...'
                  : taskStatus === 'verifying'
                  ? 'Auditing artifacts...'
                  : 'Running tasks in background...'}
              </span>
            )}
          </div>

          <div className="relative">
            <textarea
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="e.g. Research five AI startups, collect their products and pricing, create a CSV file..."
              rows={3}
              disabled={isBusy}
              className={`w-full text-xs p-2.5 rounded-xl border outline-none resize-none transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-violet-500 shadow-sm'
                  : 'bg-[#121828] border-violet-900/60 text-slate-100 placeholder-slate-500 focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30'
              } disabled:opacity-60`}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setGoalInput(demoWorkflowPrompt)}
              disabled={isBusy}
              className="text-[11px] text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 transition-colors hover:underline truncate cursor-pointer disabled:opacity-50"
              title="Load five AI startups research prompt"
            >
              ✦ Load Startups Research Demo
            </button>

            {isBusy ? (
              <button
                type="button"
                onClick={onCancelTask}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <StopCircle size={13} />
                Cancel
              </button>
            ) : (
              <button
                type="submit"
                disabled={!goalInput.trim()}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={12} />
                Run Agent
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Consequential Action Approval Prompt (Alert Banner) */}
      {pendingApproval && (
        <div className="p-3 m-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Approval Required
              </span>
              <p className="text-xs text-amber-200 mt-1 font-medium">{pendingApproval.title}</p>
              <p className="text-[11px] text-amber-300/80 mt-1">{pendingApproval.description}</p>
              {pendingApproval.consequences.length > 0 && (
                <ul className="text-[10px] text-amber-300/70 list-disc list-inside mt-1 space-y-0.5">
                  {pendingApproval.consequences.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => onApprovalResponse(pendingApproval.id, true)}
                  className="px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  Approve Action
                </button>
                <button
                  type="button"
                  onClick={() => onApprovalResponse(pendingApproval.id, false)}
                  className={`px-3 py-1 text-xs rounded-lg border font-medium transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                      : 'bg-black/40 border-white/20 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  Reject &amp; Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Plan vs Action Log vs Artifacts */}
      <div
        className={`flex border-b text-xs font-medium ${
          isLight ? 'border-slate-200 bg-slate-100/70' : 'border-white/10 bg-black/30'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'plan'
              ? 'border-violet-500 text-violet-500 dark:text-violet-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered size={13} />
          Plan {plan ? `(${plan.steps.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'logs'
              ? 'border-violet-500 text-violet-500 dark:text-violet-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal size={13} />
          Logs {logs.length > 0 ? `(${logs.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('artifacts')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'artifacts'
              ? 'border-violet-500 text-violet-500 dark:text-violet-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet size={13} />
          Files {artifacts.length > 0 ? `(${artifacts.length})` : ''}
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'plan' ? (
          <div>
            {plan ? (
              <div className="space-y-2">
                <div
                  className={`p-2.5 rounded-xl border text-[11px] leading-relaxed mb-3 ${
                    isLight
                      ? 'bg-violet-50/70 border-violet-200 text-slate-700'
                      : 'bg-violet-950/20 border-violet-500/20 text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-violet-600 dark:text-violet-300">
                    Target Goal:
                  </div>
                  <div className="mt-0.5">{plan.goal}</div>
                  {plan.summary && (
                    <div className="mt-1 pt-1 border-t border-violet-200/50 dark:border-violet-500/20 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold">Strategy:</span> {plan.summary}
                    </div>
                  )}
                </div>

                {plan.steps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                      step.status === 'in_progress'
                        ? isLight
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                          : 'bg-blue-500/10 border-blue-500/40 text-blue-200'
                        : step.status === 'completed'
                        ? isLight
                          ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                          : 'bg-white/[0.02] border-emerald-500/30 text-slate-300'
                        : step.status === 'failed'
                        ? isLight
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : 'bg-white/[0.01] border-white/5 text-slate-400'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getStepIcon(step.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {step.order}. {step.description}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded border ${
                              isLight
                                ? 'bg-slate-100 border-slate-200 text-violet-700'
                                : 'bg-black/30 border-white/10 text-violet-300'
                            }`}
                          >
                            {step.tool}
                          </span>
                          {step.requiresApproval && (
                            <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                              Requires Approval
                            </span>
                          )}
                        </div>
                        {step.result && (
                          <p
                            className={`mt-1.5 text-[10px] font-mono p-1 rounded border ${
                              isLight
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-emerald-950/30 text-emerald-300 border-emerald-900/50'
                            }`}
                          >
                            ✓ {step.result}
                          </p>
                        )}
                        {step.error && (
                          <p
                            className={`mt-1.5 text-[10px] font-mono p-1 rounded border ${
                              isLight
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-rose-950/30 text-rose-300 border-rose-900/50'
                            }`}
                          >
                            ✕ {step.error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 text-slate-400 text-xs">
                <Bot size={36} className="mx-auto mb-2 opacity-30 text-violet-400" />
                <p className="font-medium">No task plan generated yet.</p>
                <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  Enter a research goal above or click the demo prompt to begin autonomous execution.
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'logs' ? (
          <div className="font-mono text-[11px] space-y-1.5">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded-lg leading-relaxed border ${
                    log.level === 'error'
                      ? isLight
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-rose-950/30 text-rose-300 border-rose-900/40'
                      : log.level === 'warn'
                      ? isLight
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-amber-950/30 text-amber-300 border-amber-900/40'
                      : log.level === 'success'
                      ? isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40'
                      : log.level === 'action'
                      ? isLight
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-blue-950/30 text-blue-300 border-blue-900/40'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-white/[0.02] text-slate-300 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="uppercase font-semibold">[{log.level}]</span>
                    {log.tool && (
                      <span className="text-violet-500 dark:text-violet-400 font-semibold">
                        ({log.tool})
                      </span>
                    )}
                  </div>
                  <div className="font-medium mt-0.5">{log.title}</div>
                  {log.details && (
                    <div className="text-[10px] mt-0.5 opacity-80 break-words whitespace-pre-wrap">
                      {log.details}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs font-sans">
                <Terminal size={36} className="mx-auto mb-2 opacity-30 text-violet-400" />
                <p>Live execution logs will appear here.</p>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        ) : (
          <div className="space-y-3">
            {artifacts.length > 0 ? (
              artifacts.map((art, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col gap-2 ${
                    isLight
                      ? 'bg-white border-slate-200 shadow-sm'
                      : 'bg-[#121828] border-violet-900/40 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className="text-xs font-bold">{art.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {art.size} bytes • {art.headers?.length || 0} columns • {art.rows?.length || 0} rows
                        </div>
                      </div>
                    </div>
                    {onOpenArtifact && (
                      <button
                        type="button"
                        onClick={() => onOpenArtifact(art.path)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Open CSV File"
                      >
                        <FolderOpen size={13} />
                        Open
                      </button>
                    )}
                  </div>

                  {art.rows && art.rows.length > 0 && (
                    <div
                      className={`text-[10px] font-mono p-2 rounded-lg overflow-x-auto ${
                        isLight ? 'bg-slate-50 text-slate-700' : 'bg-black/30 text-slate-300'
                      }`}
                    >
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400">
                            {art.headers?.map((h, i) => (
                              <th key={i} className="pb-1 pr-2">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {art.rows.slice(0, 3).map((r, i) => (
                            <tr key={i} className="border-b border-white/5">
                              {art.headers?.map((h, j) => (
                                <td key={j} className="py-0.5 pr-2 truncate max-w-[100px]">
                                  {String(r[h] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 px-4 text-slate-400 text-xs">
                <FileSpreadsheet size={36} className="mx-auto mb-2 opacity-30 text-emerald-500" />
                <p className="font-medium">No artifacts generated yet.</p>
                <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  When tasks create CSV reports or data files, they will be saved to your local artifacts folder and listed here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        className={`p-2.5 border-t text-[10px] flex items-center justify-between ${
          isLight
            ? 'border-slate-200 bg-slate-100/50 text-slate-500'
            : 'border-white/10 bg-black/40 text-slate-400'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-violet-400" />
          Autonomous Agent • Safe Execution Guardrails
        </span>
        <span className="font-mono text-[9px] opacity-70">AdaL Nexus v0.1</span>
      </div>
    </aside>
  );
};
