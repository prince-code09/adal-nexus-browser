import React, { useState, useEffect } from 'react';
import {
  Globe,
  FileSpreadsheet,
  History as HistoryIcon,
} from 'lucide-react';
import type {
  TaskStatus,
  VerificationStatus,
  ExecutionPlan,
  ActionLogItem,
  ApprovalRequest,
  TaskRecord,
  AppSettings,
} from '../shared/types';
import { TopBar } from './components/TopBar';
import { CompanionPanel } from './components/CompanionPanel';
import { BrowserWorkspace } from './components/BrowserWorkspace';
import { ResultsWorkspace } from './components/ResultsWorkspace';
import { TaskHistory } from './components/TaskHistory';
import { SettingsModal } from './components/SettingsModal';

const defaultSettings: AppSettings = {
  llmProvider: 'mock',
  apiKey: '',
  model: 'gemini-1.5-pro-latest',
  headlessBrowser: false,
  viewportWidth: 1280,
  viewportHeight: 800,
  requireApprovalForConsequential: true,
  autoVerify: true,
};

export const App: React.FC = () => {
  const [activeWorkspace, setActiveWorkspace] = useState<'browser' | 'results' | 'history'>('browser');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('idle');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('UNVERIFIED');
  const [currentGoal, setCurrentGoal] = useState<string>('');
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [logs, setLogs] = useState<ActionLogItem[]>([]);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);

  // Browser state
  const [currentUrl, setCurrentUrl] = useState<string>('https://example.com');
  const [pageTitle, setPageTitle] = useState<string>('Example Domain');
  const [isControlledByAgent, setIsControlledByAgent] = useState<boolean>(true);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // History & settings
  const [historyTasks, setHistoryTasks] = useState<TaskRecord[]>([]);
  const [currentTaskRecord, setCurrentTaskRecord] = useState<TaskRecord | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Initialize electronAPI IPC listeners and live WebSocket progress
  useEffect(() => {
    const api = window.electronAPI;

    // 1. Establish WebSocket client for live event streaming
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:5174');
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'task:log' && msg.data) {
            setLogs((prev) => {
              if (prev.some((l) => l.id === msg.data.id)) return prev;
              return [...prev, msg.data];
            });
          } else if (msg.type === 'task:status' && msg.data) {
            if (msg.data.status) setTaskStatus(msg.data.status);
            if (msg.data.verificationStatus) setVerificationStatus(msg.data.verificationStatus);
          } else if (msg.type === 'plan:updated' && msg.data) {
            setPlan(msg.data);
          } else if (msg.type === 'step:updated' && msg.data) {
            setPlan((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                steps: prev.steps.map((s) => (s.id === msg.data.id ? { ...s, ...msg.data } : s)),
              };
            });
          } else if (msg.type === 'browser:state' && msg.data) {
            if (msg.data.url) setCurrentUrl(msg.data.url);
            if (msg.data.title) setPageTitle(msg.data.title);
            if (msg.data.screenshotBase64) setScreenshotUrl(msg.data.screenshotBase64);
          }
        } catch {}
      };
    } catch {}

    // 2. Register IPC listeners
    if (api) {
      api.getSettings().then((saved) => {
        if (saved) setSettings(saved);
      }).catch(console.error);

      api.getTaskHistory().then((history) => {
        if (history) {
          setHistoryTasks(history);
          if (history.length > 0) setCurrentTaskRecord(history[0]);
        }
      }).catch(console.error);

      const unsubPlan = api.onPlanUpdated((newPlan) => {
        setPlan(newPlan);
      });

      const unsubStep = api.onStepUpdated((step) => {
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            steps: prev.steps.map((s) => (s.id === step.id ? { ...s, ...step } : s)),
          };
        });
      });

      const unsubLog = api.onLogAdded((log) => {
        setLogs((prev) => {
          if (prev.some((l) => l.id === log.id)) return prev;
          return [...prev, log];
        });
      });

      const unsubStatus = api.onTaskStatusChanged(({ taskId, status, verificationStatus: vStatus, taskRecord }) => {
        setTaskStatus(status);
        if (vStatus) setVerificationStatus(vStatus);
        if (taskRecord) {
          setCurrentTaskRecord(taskRecord);
          setHistoryTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === taskId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = taskRecord;
              return copy;
            }
            return [taskRecord, ...prev];
          });
        }
      });

      const unsubApproval = api.onApprovalRequested((req) => {
        setPendingApproval(req);
        setTaskStatus('waiting_approval');
      });

      const unsubBrowser = api.onBrowserStateChanged((bState) => {
        if (bState.url) setCurrentUrl(bState.url);
        if (bState.title) setPageTitle(bState.title);
        setIsControlledByAgent(bState.isControlledByAgent);
        if (bState.screenshotBase64) {
          setScreenshotUrl(bState.screenshotBase64);
        }
      });

      return () => {
        ws?.close();
        unsubPlan();
        unsubStep();
        unsubLog();
        unsubStatus();
        unsubApproval();
        unsubBrowser();
      };
    } else {
      // Browser preview fallback data for Vite standalone dev
      const sampleRecord: TaskRecord = {
        id: 'sample-01',
        goal: 'Research five AI startups, collect names, products, pricing and verify CSV',
        status: 'completed',
        verificationStatus: 'VERIFIED',
        createdAt: Date.now() - 3600000,
        completedAt: Date.now() - 3400000,
        verificationReport: 'Verified 5 startups in artifacts/startups.csv. All rows and columns verified.',
        artifacts: [{ name: 'startups.csv', path: 'artifacts/startups.csv', type: 'text/csv', size: 428 }],
      };
      setHistoryTasks([sampleRecord]);
      setCurrentTaskRecord(sampleRecord);

      return () => {
        ws?.close();
      };
    }
  }, []);

  const handleStartTask = async (goal: string) => {
    setCurrentGoal(goal);
    setTaskStatus('planning');
    setVerificationStatus('UNVERIFIED');
    setLogs([
      {
        id: `init-${Date.now()}`,
        timestamp: Date.now(),
        level: 'info',
        title: 'Task Dispatched',
        details: `Autonomous browser agent initiating plan for: "${goal}"`,
      },
    ]);

    if (window.electronAPI) {
      try {
        await window.electronAPI.startTask(goal);
      } catch (err: any) {
        setTaskStatus('failed');
        setVerificationStatus('FAILED');
        setLogs((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            timestamp: Date.now(),
            level: 'error',
            title: 'Task Dispatch Failed',
            details: err?.message || String(err),
          },
        ]);
      }
    } else {
      setTaskStatus('failed');
      setVerificationStatus('FAILED');
      setLogs((prev) => [
        ...prev,
        {
          id: `no-electron-${Date.now()}`,
          timestamp: Date.now(),
          level: 'error',
          title: 'Electron Desktop Bridge Not Detected',
          details: 'Please run AdaL Nexus inside the Electron desktop application window to enable browser automation.',
        },
      ]);
    }
  };

  const handleCancelTask = async () => {
    setTaskStatus('cancelled');
    if (window.electronAPI) {
      await window.electronAPI.cancelTask(currentTaskRecord?.id || 'current');
    }
  };

  const handleApprovalResponse = async (requestId: string, approved: boolean) => {
    setPendingApproval(null);
    if (taskStatus === 'waiting_approval') {
      setTaskStatus('executing');
    }
    if (window.electronAPI) {
      await window.electronAPI.respondApproval(requestId, approved);
    }
  };

  const handleToggleTakeover = async () => {
    const nextState = !isControlledByAgent;
    setIsControlledByAgent(nextState);
    if (window.electronAPI) {
      await window.electronAPI.takeoverBrowser(!nextState);
    }
  };

  const handleOpenArtifact = async (path: string) => {
    if (window.electronAPI) {
      await window.electronAPI.openArtifact(path);
    } else {
      alert(`Opening artifact: ${path}`);
    }
  };

  const handleSaveSettings = async (updated: Partial<AppSettings>) => {
    if (window.electronAPI) {
      const saved = await window.electronAPI.saveSettings(updated);
      setSettings(saved);
    } else {
      setSettings((prev) => ({ ...prev, ...updated }));
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-surface-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <TopBar
        currentStatus={taskStatus}
        activeTab={activeWorkspace}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container with Left Rail Navigation and Workspace Views */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Rail */}
        <nav className="w-14 bg-surface-950 border-r border-surface-800 flex flex-col items-center py-3 gap-3 z-10 shrink-0">
          <button
            onClick={() => setActiveWorkspace('browser')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeWorkspace === 'browser'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800'
            }`}
            title="Browser Workspace & Companion"
          >
            <Globe size={18} />
          </button>

          <button
            onClick={() => setActiveWorkspace('results')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeWorkspace === 'results'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800'
            }`}
            title="Results & Verification Workspace"
          >
            <FileSpreadsheet size={18} />
          </button>

          <button
            onClick={() => setActiveWorkspace('history')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeWorkspace === 'history'
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-800'
            }`}
            title="Task Execution History"
          >
            <HistoryIcon size={18} />
          </button>
        </nav>

        {/* Center/Right Workspaces */}
        <div className="flex-1 flex overflow-hidden">
          {activeWorkspace === 'browser' && (
            <>
              {/* Companion Panel */}
              <CompanionPanel
                currentGoal={currentGoal}
                onStartTask={handleStartTask}
                onCancelTask={handleCancelTask}
                taskStatus={taskStatus}
                verificationStatus={verificationStatus}
                plan={plan}
                logs={logs}
                pendingApproval={pendingApproval}
                onApprovalResponse={handleApprovalResponse}
              />

              {/* Browser Workspace View */}
              <BrowserWorkspace
                currentUrl={currentUrl}
                pageTitle={pageTitle}
                isControlledByAgent={isControlledByAgent}
                onToggleTakeover={handleToggleTakeover}
                screenshotUrl={screenshotUrl}
              />
            </>
          )}

          {activeWorkspace === 'results' && (
            <ResultsWorkspace
              currentTask={currentTaskRecord}
              onOpenArtifact={handleOpenArtifact}
            />
          )}

          {activeWorkspace === 'history' && (
            <TaskHistory
              tasks={historyTasks}
              onSelectTask={(task) => {
                setCurrentTaskRecord(task);
                setActiveWorkspace('results');
              }}
            />
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialSettings={settings}
      />
    </div>
  );
};

export default App;
