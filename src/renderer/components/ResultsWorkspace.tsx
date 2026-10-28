import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  FolderOpen,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import type { VerificationStatus, TaskRecord } from '../../shared/types';
import { VerificationBadge } from './VerificationBadge';

interface ResultsWorkspaceProps {
  currentTask: TaskRecord | null;
  onOpenArtifact: (path: string) => void;
}

export const ResultsWorkspace: React.FC<ResultsWorkspaceProps> = ({
  currentTask,
  onOpenArtifact,
}) => {
  const verificationStatus: VerificationStatus = currentTask?.verificationStatus || 'UNVERIFIED';
  const hasArtifacts = currentTask?.artifacts && currentTask.artifacts.length > 0;
  const primaryArtifact = hasArtifacts ? currentTask.artifacts![0] : null;

  // Fallback sample data if no task is selected yet
  const rows = primaryArtifact?.rows || [
    {
      company_name: 'Anthropic',
      product: 'Claude 3.5 Sonnet & Claude Enterprise',
      pricing: '$20/mo Pro, API per-token usage',
      source_url: 'https://anthropic.com',
    },
    {
      company_name: 'Perplexity AI',
      product: 'Conversational Search & Research Engine',
      pricing: '$20/mo Pro, Free Tier available',
      source_url: 'https://perplexity.ai',
    },
    {
      company_name: 'Mistral AI',
      product: 'Mistral Large, Pixtral & Le Chat',
      pricing: 'Open weights free, API pay-as-you-go',
      source_url: 'https://mistral.ai',
    },
    {
      company_name: 'Cohere',
      product: 'Command R+, Embed & Rerank Enterprise Models',
      pricing: 'Usage-based API, Custom Enterprise',
      source_url: 'https://cohere.com',
    },
    {
      company_name: 'Cursor (Anysphere)',
      product: 'AI-first Code Editor & Composer',
      pricing: '$20/mo Pro, $40/mo Business, Free Hobby tier',
      source_url: 'https://cursor.com',
    },
  ];

  const headers = primaryArtifact?.headers || ['company_name', 'product', 'pricing', 'source_url'];
  const assertions = currentTask?.verificationDetails?.assertions || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-950 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Workspace Header & Verification Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-surface-900 border border-surface-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-100">Results &amp; Verification Workspace</h2>
              <VerificationBadge status={verificationStatus} size="lg" />
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              AdaL Nexus enforces independent verification through read-back of actual output files.
              Results are audited against deterministic checks before final sign-off.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {primaryArtifact && (
              <button
                onClick={() => onOpenArtifact(primaryArtifact.path)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-2 transition-colors shadow-sm"
              >
                <FolderOpen size={15} />
                Open Artifact ({primaryArtifact.name})
              </button>
            )}
          </div>
        </div>

        {/* Verification Report Card */}
        <div className="p-4 rounded-xl bg-surface-900/80 border border-surface-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <ShieldCheck size={16} className="text-brand-400" />
              Independent Verification Report
            </div>
            <VerificationBadge status={verificationStatus} size="sm" />
          </div>
          <p className="text-xs font-mono text-slate-300 leading-relaxed bg-surface-950 p-3 rounded-lg border border-surface-800">
            {currentTask?.verificationReport ||
              'Awaiting task completion. Deterministic verification will audit file existence, schema headers, row counts, and citations.'}
          </p>

          {/* Verification Assertions Breakdown */}
          {assertions.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Audited Assertions ({assertions.filter((a) => a.passed).length}/{assertions.length} Passed)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {assertions.map((assertion) => (
                  <div
                    key={assertion.id}
                    className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                      assertion.passed
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-slate-200">
                        {assertion.passed ? (
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle size={14} className="text-rose-400 shrink-0" />
                        )}
                        {assertion.name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          assertion.passed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {assertion.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
                      <div>
                        <span className="text-slate-500">Expected:</span> {assertion.expected}
                      </div>
                      <div>
                        <span className="text-slate-500">Actual:</span> {assertion.actual}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Structured Table / CSV Preview */}
        <div className="rounded-xl bg-surface-900 border border-surface-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                Extracted Data Preview ({primaryArtifact?.name || 'startups.csv'})
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {rows.length} rows &bull; {headers.length} columns
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-950/60 border-b border-surface-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-4 font-mono text-[11px]">#</th>
                  {headers.map((h) => (
                    <th key={h} className="py-2.5 px-4 capitalize font-semibold">
                      {h.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 font-mono text-[11px]">
                {rows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-surface-800/30 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                    {headers.map((h) => {
                      const val = row[h] || '';
                      if (h === 'source_url' && val.startsWith('http')) {
                        return (
                          <td key={h} className="py-2.5 px-4">
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-400 hover:text-brand-300 underline flex items-center gap-1"
                            >
                              {val} <ExternalLink size={11} />
                            </a>
                          </td>
                        );
                      }
                      if (h === 'pricing' && val.toLowerCase() === 'unknown') {
                        return (
                          <td key={h} className="py-2.5 px-4 text-amber-400 italic">
                            unknown
                          </td>
                        );
                      }
                      return (
                        <td key={h} className="py-2.5 px-4 text-slate-200">
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
