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
  FileText,
  FolderOpen,
  Bot,
  User,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  ExecutionPlan,
  PlanStep,
  ActionLogItem,
  ApprovalRequest,
  TaskStatus,
  VerificationStatus,
  ArtifactItem,
  ChatMessage,
} from '../../shared/types';
import { VerificationBadge } from './VerificationBadge';

interface CompanionPanelProps {
  currentGoal: string;
  onStartTask: (goal: string) => void;
  onCancelTask: () => void;
  onNewChat?: () => void;
  taskStatus: TaskStatus;
  verificationStatus: VerificationStatus;
  plan: ExecutionPlan | null;
  logs: ActionLogItem[];
  pendingApproval: ApprovalRequest | null;
  onApprovalResponse: (requestId: string, approved: boolean) => void;
  artifacts?: ArtifactItem[];
  onOpenArtifact?: (path: string) => void;
  onDeleteArtifact?: (path: string) => void;
  onClose?: () => void;
  theme?: 'dark' | 'light';
  messages?: ChatMessage[];
  tabId?: string;
}

export function detectLanguage(text: string): 'hi' | 'hinglish' | 'en' {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const lower = text.toLowerCase();
  const hinglishWords = [
    'karo',
    'banao',
    'dhundho',
    'khojo',
    'chahiye',
    'paanch',
    'karke',
    'kaise',
    'hai',
    'aur',
    'unka',
    'batao',
    'mujhe',
    'kya',
    'nahi',
    'shukriya',
    'bhejo',
    'hatao',
  ];
  if (hinglishWords.some((w) => lower.includes(w))) return 'hinglish';
  return 'en';
}

export function getLocalizedMessage(
  key: 'planning' | 'executing' | 'verifying' | 'completed' | 'failed' | 'cancelled',
  lang: 'hi' | 'hinglish' | 'en'
): string {
  switch (key) {
    case 'planning':
      if (lang === 'hi') return 'आपके लक्ष्य का विश्लेषण करके निष्पादन योजना तैयार की जा रही है...';
      if (lang === 'hinglish') return 'Goal ko analyze karke execution plan taiyaar kiya ja raha hai...';
      return 'Analyzing research goal and building execution plan...';
    case 'executing':
      if (lang === 'hi') return 'आधिकारिक वेबसाइटों पर जाकर सत्यापित डेटा एकत्र किया जा रहा है...';
      if (lang === 'hinglish') return 'Official websites visit karke verified data collect kiya ja raha hai...';
      return 'Visiting target websites and gathering verified findings...';
    case 'verifying':
      if (lang === 'hi') return 'समेकित पीडीएफ रिपोर्ट और निष्कर्षों का भौतिक ऑडिट चल रहा है...';
      if (lang === 'hinglish') return 'Consolidated PDF report aur findings ka audit chal raha hai...';
      return 'Auditing physical report deliverables and source citations...';
    case 'completed':
      if (lang === 'hi') return 'शोध सफलतापूर्वक पूरा हुआ और सत्यापित किया गया!';
      if (lang === 'hinglish') return 'Research poora hua aur report verify ho gayi!';
      return 'Research completed and independently verified!';
    case 'failed':
      if (lang === 'hi') return 'टास्क निष्पादन में त्रुटि हुई।';
      if (lang === 'hinglish') return 'Task execute karne me error aayi.';
      return 'Task execution encountered an error.';
    case 'cancelled':
      if (lang === 'hi') return 'उपयोगकर्ता द्वारा टास्क रद्द कर दिया गया।';
      if (lang === 'hinglish') return 'User ne task cancel kar diya.';
      return 'Task cancelled by user.';
  }
}

export const CompanionPanel: React.FC<CompanionPanelProps> = ({
  currentGoal,
  onStartTask,
  onCancelTask,
  onNewChat,
  taskStatus,
  verificationStatus,
  plan,
  logs,
  pendingApproval,
  onApprovalResponse,
  artifacts = [],
  onOpenArtifact,
  onDeleteArtifact,
  onClose,
  theme = 'dark',
  messages = [],
  tabId = '',
}) => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'plan' | 'logs' | 'artifacts'>('chat');
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isLight = theme === 'light';

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, taskStatus, activeTab]);

  useEffect(() => {
    if (activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  const isBusy =
    taskStatus === 'planning' ||
    taskStatus === 'executing' ||
    taskStatus === 'verifying' ||
    taskStatus === 'waiting_approval';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isBusy) return;

    onStartTask(trimmed);
    setInputText('');
    setActiveTab('chat');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const detectedLang = detectLanguage(currentGoal || inputText || 'en');

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
      className={`w-[410px] flex flex-col h-full border-l shadow-2xl transition-all duration-150 select-none ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#0b0f19] border-violet-950/40 text-slate-100 shadow-[0_0_30px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* 1. Panel Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between ${
          isLight
            ? 'border-slate-200 bg-gradient-to-r from-violet-50/80 to-transparent'
            : 'border-white/10 bg-gradient-to-r from-violet-950/40 to-transparent'
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
              Tab Workspace: <span className="font-mono text-violet-400">{tabId ? tabId.slice(0, 8) : 'active'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNewChat && (
            <button
              type="button"
              onClick={() => {
                setInputText('');
                onNewChat();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
                isLight
                  ? 'bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-300'
                  : 'bg-violet-600/25 hover:bg-violet-600/40 text-violet-200 border border-violet-500/40 hover:border-violet-400'
              }`}
              title="Start New Chat (Clears active conversation, preserves files)"
            >
              <Plus size={13} />
              New Chat
            </button>
          )}
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

      {/* 2. Consequential Action Approval Prompt (Alert Banner) */}
      {pendingApproval && (
        <div className="p-3 m-2 rounded-xl bg-amber-500/10 border border-amber-500/40 shadow-lg">
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

      {/* 3. View Switcher Tabs: Chat (Default), Plan, Logs, Files */}
      <div
        className={`flex border-b text-xs font-medium shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-100/70' : 'border-white/10 bg-black/30'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'chat'
              ? 'border-violet-500 text-violet-500 dark:text-violet-400 font-semibold'
              : isLight
              ? 'border-transparent text-slate-500 hover:text-slate-800'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot size={13} />
          Chat
        </button>
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
          <FileText size={13} />
          Files {artifacts.length > 0 ? `(${artifacts.length})` : ''}
        </button>
      </div>

      {/* 4. Tab Content Area (Scrollable Conversation Feed) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {activeTab === 'chat' && (
          <div className="space-y-3">
            {/* If no messages yet, show conversation welcome state */}
            {messages.length === 0 && !isBusy && !currentGoal ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-fuchsia-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-3 text-violet-400 shadow-lg shadow-violet-500/20">
                  <Bot size={24} />
                </div>
                <h3 className="font-bold text-sm tracking-tight">AdaL Autonomous Agent</h3>
                <p className={`text-xs mt-1.5 max-w-[280px] mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Ready for autonomous web research, price comparisons, and consolidated PDF reports.
                </p>
              </div>
            ) : (
              /* Chat Conversation Messages */
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-2">
                    {/* User Message Bubble */}
                    {msg.sender === 'user' && (
                      <div className="flex items-start gap-2 justify-end">
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                            isLight
                              ? 'bg-violet-600 text-white rounded-br-xs'
                              : 'bg-violet-600 text-white rounded-br-xs shadow-md shadow-violet-900/30'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <span className="block text-[9px] mt-1 text-white/70 text-right">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-violet-700 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                          <User size={13} />
                        </div>
                      </div>
                    )}

                    {/* Agent Message Bubble */}
                    {msg.sender === 'agent' && (
                      <div className="flex items-start gap-2 justify-start">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] shadow-sm">
                          <Bot size={13} />
                        </div>
                        <div
                          className={`max-w-[94%] rounded-2xl p-3.5 text-xs leading-relaxed border space-y-3 ${
                            isLight
                              ? 'bg-white border-slate-200 text-slate-800 shadow-sm rounded-tl-xs'
                              : 'bg-[#121828] border-violet-900/40 text-slate-100 rounded-tl-xs shadow-xl shadow-black/40'
                          }`}
                        >
                          {/* Main Text Content */}
                          <p className="whitespace-pre-wrap break-words font-medium">{msg.content}</p>

                          {/* 1. Structured Findings Table if available */}
                          {msg.findingsData && msg.findingsData.length > 0 && (
                            <div className="rounded-xl border border-violet-500/25 overflow-hidden shadow-sm">
                              <div
                                className={`p-2 font-bold text-[10px] tracking-wider uppercase flex items-center justify-between ${
                                  isLight ? 'bg-violet-50 text-violet-800' : 'bg-violet-950/40 text-violet-300'
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <Sparkles size={12} className="text-violet-400" />
                                  Verified Research Findings ({msg.findingsData.length})
                                </span>
                              </div>
                              <div className="overflow-x-auto max-h-56">
                                <table className="w-full text-[11px] text-left border-collapse">
                                  <thead>
                                    <tr className={isLight ? 'bg-slate-100/90 text-slate-700' : 'bg-white/[0.04] text-slate-300'}>
                                      <th className="p-2 border-b border-white/10 font-semibold">
                                        {msg.findingsData.some((f: any) => f.seller) ? 'Seller' : 'Entity'}
                                      </th>
                                      <th className="p-2 border-b border-white/10 font-semibold">
                                        {msg.findingsData.some((f: any) => f.variety) ? 'Variety / Pack' : 'Product / Details'}
                                      </th>
                                      <th className="p-2 border-b border-white/10 font-semibold">Price</th>
                                      {msg.findingsData.some((f: any) => f.pricePerKg) && (
                                        <th className="p-2 border-b border-white/10 font-semibold">Rate (₹/kg)</th>
                                      )}
                                      {msg.findingsData.some((f: any) => f.delivery) && (
                                        <th className="p-2 border-b border-white/10 font-semibold">Delivery</th>
                                      )}
                                      <th className="p-2 border-b border-white/10 font-semibold text-center">Source</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {msg.findingsData.map((f, i) => {
                                      const name = f.seller || f.company_name || f.name || f.title || f.Company || `Entity ${i + 1}`;
                                      const product = f.variety || f.product || f.Product || f.description || f.category || '—';
                                      const pricing = f.price || f.pricing || f.Pricing || f.PricingModel || 'Verified';
                                      const pricePerKg = f.pricePerKg || '—';
                                      const delivery = f.delivery || '—';
                                      const url = f.source_url || f.url || f.link || f.source;
                                      return (
                                        <tr key={i} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.03]'}>
                                          <td className="p-2 font-bold text-violet-400 whitespace-nowrap">{name}</td>
                                          <td className="p-2 text-slate-300 min-w-[90px]">{product}</td>
                                          <td className="p-2 text-emerald-400 font-medium whitespace-nowrap">{pricing}</td>
                                          {msg.findingsData?.some((it: any) => it.pricePerKg) && (
                                            <td className="p-2 text-amber-300 font-semibold whitespace-nowrap">{pricePerKg}</td>
                                          )}
                                          {msg.findingsData?.some((it: any) => it.delivery) && (
                                            <td className="p-2 text-[10px] text-slate-400 min-w-[80px]">{delivery}</td>
                                          )}
                                          <td className="p-2 text-center whitespace-nowrap">
                                            {url ? (
                                              <button
                                                type="button"
                                                onClick={() => window.adalNexus?.navigate(tabId, url)}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 transition-colors cursor-pointer"
                                                title={`Open ${url} in active tab`}
                                              >
                                                Visit <ExternalLink size={10} />
                                              </button>
                                            ) : (
                                              <span className="text-slate-500 text-[10px]">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* 2. Key Findings Bullet Points (if findingsData table is absent) */}
                          {(!msg.findingsData || msg.findingsData.length === 0) && msg.keyFindings && msg.keyFindings.length > 0 && (
                            <div
                              className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/10'
                              }`}
                            >
                              <div className="font-semibold text-violet-500 uppercase tracking-wide text-[10px] flex items-center gap-1">
                                <Sparkles size={11} />
                                Key Findings:
                              </div>
                              {msg.keyFindings.map((finding, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <span className="text-violet-400 font-bold">•</span>
                                  <span className="break-words">{finding}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 3. Executive Conclusion */}
                          {msg.conclusion && (
                            <div
                              className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                                isLight ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                              }`}
                            >
                              <div className="font-bold text-[10px] tracking-wider uppercase text-emerald-400 flex items-center gap-1">
                                <CheckCircle size={12} className="text-emerald-400" />
                                Conclusion &amp; Key Insights:
                              </div>
                              <p className="text-[11px] leading-relaxed break-words">{msg.conclusion}</p>
                            </div>
                          )}

                          {/* 4. PDF Deliverable Inline Action Card */}
                          {(msg.pdfPath || (msg.artifacts && msg.artifacts.some((a) => a.path.endsWith('.pdf')))) && (
                            <div
                              className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                                isLight
                                  ? 'bg-violet-50 border-violet-200 text-violet-950 shadow-sm'
                                  : 'bg-violet-950/30 border-violet-500/30 text-violet-100 shadow-md'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-violet-600 text-white shrink-0 shadow-sm">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs truncate">
                                    {msg.pdfPath ? msg.pdfPath.split(/[/\\]/).pop() : 'Consolidated_Research_Report.pdf'}
                                  </div>
                                  <div className={`text-[10px] ${isLight ? 'text-violet-700' : 'text-violet-300'}`}>
                                    PDF Deliverable • Verified Format
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={async () => {
                                  const targetPath = msg.pdfPath || msg.artifacts?.find((a) => a.path.endsWith('.pdf'))?.path;
                                  if (targetPath && onOpenArtifact) {
                                    onOpenArtifact(targetPath);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/30 transition-all cursor-pointer shrink-0 active:scale-95"
                                title="Open PDF Report"
                              >
                                <FolderOpen size={13} />
                                Open PDF
                              </button>
                            </div>
                          )}

                          <span className="block text-[9px] text-slate-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Active Execution Live Progress Bubble */}
                {isBusy && (
                  <div className="flex items-start gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                      <Loader2 size={13} className="animate-spin" />
                    </div>
                    <div
                      className={`max-w-[88%] rounded-2xl p-3 text-xs border space-y-2 ${
                        isLight ? 'bg-violet-50/80 border-violet-200 text-violet-950' : 'bg-violet-950/20 border-violet-500/30 text-violet-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                        <span>{getLocalizedMessage(taskStatus as any, detectedLang)}</span>
                      </div>
                      {plan && (
                        <div className="text-[11px] opacity-80">
                          Step {plan.steps.filter((s) => s.status === 'completed').length + 1} of {plan.steps.length}:{' '}
                          {plan.steps.find((s) => s.status === 'in_progress')?.description || 'Executing autonomous steps...'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}

        {/* Plan Tab View */}
        {activeTab === 'plan' && (
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
                <ListOrdered size={36} className="mx-auto mb-2 opacity-30 text-violet-400" />
                <p className="font-medium">No task plan generated yet.</p>
                <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  Submit a prompt in the chat composer below to plan and execute.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab View */}
        {activeTab === 'logs' && (
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
        )}

        {/* Files / Artifacts Tab View */}
        {activeTab === 'artifacts' && (
          <div className="space-y-3">
            {artifacts.length > 0 ? (
              artifacts.map((art, idx) => {
                const isPdf = art.path.toLowerCase().endsWith('.pdf') || art.type === 'application/pdf';
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col gap-2 ${
                      isLight
                        ? 'bg-white border-slate-200 shadow-sm'
                        : 'bg-[#121828] border-violet-900/40 shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {isPdf ? (
                          <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
                            <FileText className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold">{art.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {art.size} bytes • {isPdf ? 'PDF Report Document' : `${art.headers?.length || 0} cols • ${art.rows?.length || 0} rows`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onOpenArtifact && (
                          <button
                            type="button"
                            onClick={() => onOpenArtifact(art.path)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-sm"
                            title="Open Deliverable in AdaL Nexus"
                          >
                            <FolderOpen size={13} />
                            Open
                          </button>
                        )}

                        {onDeleteArtifact && (
                          deletingPath === art.path ? (
                            <div className="flex items-center gap-1 animate-fadeIn">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteArtifact(art.path);
                                  setDeletingPath(null);
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer active:scale-95 shadow-sm"
                                title="Confirm Permanent Deletion"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPath(null)}
                                className="px-1.5 py-1 text-[11px] rounded bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"
                                title="Cancel"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingPath(art.path)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isLight
                                  ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-slate-200 hover:border-rose-300'
                                  : 'hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border-white/5 hover:border-rose-500/40'
                              }`}
                              title="Delete Report"
                            >
                              <Trash2 size={13} />
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {art.contentPreview && (
                      <p className={`text-[10px] p-2 rounded-lg whitespace-pre-wrap ${
                        isLight ? 'bg-slate-50 text-slate-600' : 'bg-black/30 text-slate-300'
                      }`}>
                        {art.contentPreview.slice(0, 300)}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 px-4 text-slate-400 text-xs">
                <FileText size={36} className="mx-auto mb-2 opacity-30 text-violet-400" />
                <p className="font-medium">No deliverables generated yet.</p>
                <p className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  When research tasks run, consolidated PDF reports will be created and accessible here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Fixed Bottom Chat Composer */}
      <div
        className={`p-3 border-t shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50/90' : 'border-white/10 bg-[#090d18]'
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AdaL Agent or type a research goal (Enter to run)..."
              rows={2}
              disabled={isBusy}
              className={`w-full text-xs p-2.5 pr-10 rounded-xl border outline-none resize-none transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-violet-500 shadow-sm'
                  : 'bg-[#121828] border-violet-900/60 text-slate-100 placeholder-slate-500 focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/30'
              } disabled:opacity-60`}
            />

            {inputText.trim() && !isBusy && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute top-2.5 right-2 text-slate-400 hover:text-slate-200 transition-colors"
                title="Clear input"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            {isBusy ? (
              <button
                type="button"
                onClick={onCancelTask}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <StopCircle size={13} />
                Cancel Task
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={12} />
                Send
              </button>
            )}
          </div>
        </form>
      </div>
    </aside>
  );
};
