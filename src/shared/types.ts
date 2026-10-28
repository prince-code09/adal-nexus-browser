export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'UNVERIFIED';

export type TaskStatus =
  | 'idle'
  | 'planning'
  | 'waiting_approval'
  | 'executing'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PlanStep {
  id: string;
  order: number;
  description: string;
  tool: string;
  params: Record<string, any>;
  requiresApproval?: boolean;
  expectedOutcome?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  durationMs?: number;
}

export interface ExecutionPlan {
  goal: string;
  summary: string;
  steps: PlanStep[];
  createdAt: number;
}

export interface ActionLogItem {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success' | 'action';
  title: string;
  details?: string;
  stepId?: string;
  tool?: string;
  data?: any;
}

export interface ApprovalRequest {
  id: string;
  stepId: string;
  actionType: 'send_message' | 'publish_content' | 'delete_data' | 'consequential_action';
  title: string;
  description: string;
  consequences: string[];
  parameters: Record<string, any>;
  timestamp: number;
}

export interface VerificationAssertion {
  id: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  evidence?: any;
}

export interface VerificationReport {
  taskId: string;
  status: VerificationStatus;
  summary: string;
  timestamp: number;
  assertions: VerificationAssertion[];
  artifactsChecked: string[];
  rawEvidence?: Record<string, any>;
}

export interface ArtifactItem {
  name: string;
  path: string;
  type: string;
  size?: number;
  contentPreview?: string;
  headers?: string[];
  rows?: Record<string, any>[];
}

export interface TaskRecord {
  id: string;
  goal: string;
  status: TaskStatus;
  verificationStatus: VerificationStatus;
  createdAt: number;
  completedAt?: number;
  plan?: ExecutionPlan;
  verificationReport?: string;
  verificationDetails?: VerificationReport;
  artifacts?: ArtifactItem[];
  error?: string;
}

export interface BrowserState {
  url: string;
  title: string;
  isControlledByAgent: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isLoading?: boolean;
  screenshotBase64?: string | null;
}

export interface AppSettings {
  llmProvider: 'mock' | 'gemini' | 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model: string;
  apiBaseUrl?: string;
  headlessBrowser: boolean;
  viewportWidth: number;
  viewportHeight: number;
  requireApprovalForConsequential: boolean;
  autoVerify: boolean;
  wsPort?: number;
}

export interface ElectronAPI {
  // App info & window
  getVersion: () => Promise<string>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;

  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;

  // Tasks & Planner
  startTask: (goal: string) => Promise<{ taskId: string }>;
  cancelTask: (taskId: string) => Promise<boolean>;
  respondApproval: (requestId: string, approved: boolean) => Promise<void>;

  // Browser Takeover & Controls
  takeoverBrowser: (takeover: boolean) => Promise<boolean>;
  navigateBrowser: (url: string) => Promise<boolean>;
  reloadBrowser: () => Promise<boolean>;

  // History & Artifacts
  getTaskHistory: () => Promise<TaskRecord[]>;
  getTaskDetails: (taskId: string) => Promise<TaskRecord | null>;
  openArtifact: (filePath: string) => Promise<boolean>;
  getArtifactContent: (filePath: string) => Promise<{ content: string; parsed?: any }>;

  // Subscriptions / Events from main process
  onPlanUpdated: (callback: (plan: ExecutionPlan) => void) => () => void;
  onStepUpdated: (callback: (step: PlanStep) => void) => () => void;
  onLogAdded: (callback: (log: ActionLogItem) => void) => () => void;
  onTaskStatusChanged: (
    callback: (data: {
      taskId: string;
      status: TaskStatus;
      verificationStatus: VerificationStatus;
      report?: VerificationReport;
      taskRecord?: TaskRecord;
    }) => void
  ) => () => void;
  onApprovalRequested: (callback: (request: ApprovalRequest) => void) => () => void;
  onBrowserStateChanged: (callback: (data: BrowserState) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
