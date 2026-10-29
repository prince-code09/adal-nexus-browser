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

export interface AttachedImage {
  name: string;
  path?: string;
  dataUrl: string;
  sizeBytes?: number;
  size?: number;
  type?: string;
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
  whyRequired?: string;
  targetResource?: string;
  ifAllowed?: string;
  ifDenied?: string;
  attachedImage?: AttachedImage;
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
  createdAt?: number;
  updatedAt?: number;
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
  resultSummary?: string;
  findings?: Record<string, any>[];
  pdfReportPath?: string;
  attachedImage?: AttachedImage;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  status?: 'pending' | 'success' | 'error';
  plan?: ExecutionPlan;
  artifacts?: ArtifactItem[];
  verificationStatus?: VerificationStatus;
  keyFindings?: string[];
  findingsData?: Record<string, any>[];
  conclusion?: string;
  pdfPath?: string;
  attachedImage?: AttachedImage;
}

export interface TabAgentWorkspace {
  tabId: string;
  messages: ChatMessage[];
  currentGoal: string;
  taskStatus: TaskStatus;
  verificationStatus: VerificationStatus;
  plan: ExecutionPlan | null;
  logs: ActionLogItem[];
  pendingApproval: ApprovalRequest | null;
  currentTaskId: string | null;
  artifacts: ArtifactItem[];
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
  startTask: (goal: string, context?: { previousQueries?: string[]; attachedImage?: AttachedImage }) => Promise<{ taskId: string }>;
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
  getAllArtifacts: () => Promise<ArtifactItem[]>;
  deleteArtifact: (filePath: string) => Promise<boolean>;

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

import type {
  BrowserTab,
  Bookmark,
  HistoryItem,
  DownloadItem,
  BrowserSettings,
  BrowserBounds,
  WallpaperInfo,
} from './browser-types';

export type { WallpaperInfo };

export interface SystemTelemetry {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  privateBytesMB: number;
  gpuRenderer: string;
  gpuStatus: string;
  cpuPercent?: number;
  nodeVersion: string;
  electronVersion: string;
  chromeVersion: string;
  sandboxVerified: boolean;
  contextIsolationVerified: boolean;
}

export interface ExtensionItem {
  id: string;
  name: string;
  version: string;
  path?: string;
  enabled: boolean;
  description?: string;
}

export * from './browser-types';

export interface AdaLNexusAPI {
  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;

  // Tabs
  createTab: (url?: string) => Promise<BrowserTab>;
  switchTab: (tabId: string) => Promise<boolean>;
  closeTab: (tabId: string) => Promise<boolean>;
  getTabs: () => Promise<BrowserTab[]>;
  getActiveTab: () => Promise<BrowserTab | null>;
  setBounds: (bounds: BrowserBounds) => Promise<void>;
  setViewVisible: (visible: boolean) => Promise<boolean>;

  // Navigation
  navigate: (tabId: string, urlOrQuery: string) => Promise<boolean>;
  goBack: (tabId: string) => Promise<boolean>;
  goForward: (tabId: string) => Promise<boolean>;
  reload: (tabId: string) => Promise<boolean>;
  stop: (tabId: string) => Promise<boolean>;
  goHome: (tabId: string) => Promise<boolean>;

  // Bookmarks
  getBookmarks: () => Promise<Bookmark[]>;
  addBookmark: (bookmark: { title: string; url: string; favicon?: string }) => Promise<Bookmark>;
  removeBookmark: (idOrUrl: string) => Promise<boolean>;
  isBookmarked: (url: string) => Promise<boolean>;

  // History
  getHistory: () => Promise<HistoryItem[]>;
  clearHistory: () => Promise<void>;
  removeHistoryItem: (id: string) => Promise<boolean>;

  // Downloads
  getDownloads: () => Promise<DownloadItem[]>;
  openDownloadFile: (id: string) => Promise<boolean>;
  showDownloadInFolder: (id: string) => Promise<boolean>;
  cancelDownload: (id: string) => Promise<boolean>;

  // Settings
  getBrowserSettings: () => Promise<BrowserSettings>;
  saveBrowserSettings: (settings: Partial<BrowserSettings>) => Promise<BrowserSettings>;

  // Live Wallpaper
  getLiveWallpaper?: () => Promise<WallpaperInfo>;
  refreshLiveWallpaper?: () => Promise<WallpaperInfo>;

  // System & Extensions
  getSystemTelemetry?: () => Promise<SystemTelemetry>;
  optimizeMemory?: () => Promise<{ success: boolean; freedMB?: number; error?: string }>;
  clearCacheAndHistory?: () => Promise<{ success: boolean; recordsRemoved: number; cacheCleared: boolean }>;
  getExtensions?: () => Promise<ExtensionItem[]>;
  getAllArtifacts?: () => Promise<ArtifactItem[]>;
  deleteArtifact?: (filePath: string) => Promise<boolean>;
  openArtifact?: (filePath: string) => Promise<boolean>;

  // Events
  onTabsUpdated: (callback: (tabs: BrowserTab[]) => void) => () => void;
  onActiveTabChanged: (callback: (tab: BrowserTab | null) => void) => () => void;
  onDownloadUpdated: (callback: (download: DownloadItem) => void) => () => void;
  onHistoryUpdated: (callback: (history: HistoryItem[]) => void) => () => void;
  onBookmarksUpdated: (callback: (bookmarks: Bookmark[]) => void) => () => void;
  onSettingsUpdated: (callback: (settings: BrowserSettings) => void) => () => void;
  onLiveWallpaperUpdated?: (callback: (info: WallpaperInfo) => void) => () => void;
  onFocusUrlInput?: (callback: () => void) => () => void;
  onShortcutBookmark?: (callback: (url: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    adalNexus?: AdaLNexusAPI;
  }
}
