import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type {
  AppSettings,
  ElectronAPI,
  AdaLNexusAPI,
  ExecutionPlan,
  PlanStep,
  ActionLogItem,
  ApprovalRequest,
  TaskRecord,
  TaskStatus,
  VerificationStatus,
  BrowserState,
  VerificationReport,
  BrowserTab,
  BrowserBounds,
  Bookmark,
  HistoryItem,
  DownloadItem,
  BrowserSettings,
} from '../shared/types';

const adalNexus: AdaLNexusAPI = {
  // Window controls
  minimize: () => ipcRenderer.send(IPC_CHANNELS.MINIMIZE),
  maximize: () => ipcRenderer.send(IPC_CHANNELS.MAXIMIZE),
  close: () => ipcRenderer.send(IPC_CHANNELS.CLOSE),
  isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.IS_MAXIMIZED),

  // Tabs
  createTab: (url?: string) => ipcRenderer.invoke(IPC_CHANNELS.TAB_CREATE, url),
  switchTab: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.TAB_SWITCH, tabId),
  closeTab: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.TAB_CLOSE, tabId),
  getTabs: () => ipcRenderer.invoke(IPC_CHANNELS.TAB_GET_ALL),
  setBounds: (bounds: BrowserBounds) => ipcRenderer.invoke(IPC_CHANNELS.TAB_SET_BOUNDS, bounds),

  // Navigation
  navigate: (tabId: string, urlOrQuery: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.NAV_NAVIGATE, tabId, urlOrQuery),
  goBack: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.NAV_GO_BACK, tabId),
  goForward: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.NAV_GO_FORWARD, tabId),
  reload: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.NAV_RELOAD, tabId),
  stop: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.NAV_STOP, tabId),
  goHome: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.NAV_GO_HOME, tabId),

  // Bookmarks
  getBookmarks: () => ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_GET),
  addBookmark: (bookmark: { title: string; url: string; favicon?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_ADD, bookmark),
  removeBookmark: (idOrUrl: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_REMOVE, idOrUrl),
  isBookmarked: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_IS_BOOKMARKED, url),

  // History
  getHistory: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET),
  clearHistory: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_CLEAR),
  removeHistoryItem: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_REMOVE, id),

  // Downloads
  getDownloads: () => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_GET),
  openDownloadFile: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_OPEN_FILE, id),
  showDownloadInFolder: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_SHOW_IN_FOLDER, id),
  cancelDownload: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_CANCEL, id),

  // Settings
  getBrowserSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_BROWSER),
  saveBrowserSettings: (settings: Partial<BrowserSettings>) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE_BROWSER, settings),

  // Event Subscriptions
  onTabsUpdated: (callback: (tabs: BrowserTab[]) => void) => {
    const handler = (_evt: any, tabs: BrowserTab[]) => callback(tabs);
    ipcRenderer.on(IPC_CHANNELS.EVENT_TABS_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_TABS_UPDATED, handler);
    };
  },

  onActiveTabChanged: (callback: (tab: BrowserTab | null) => void) => {
    const handler = (_evt: any, tab: BrowserTab | null) => callback(tab);
    ipcRenderer.on(IPC_CHANNELS.EVENT_ACTIVE_TAB_CHANGED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_ACTIVE_TAB_CHANGED, handler);
    };
  },

  onDownloadUpdated: (callback: (download: DownloadItem) => void) => {
    const handler = (_evt: any, download: DownloadItem) => callback(download);
    ipcRenderer.on(IPC_CHANNELS.EVENT_DOWNLOAD_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_DOWNLOAD_UPDATED, handler);
    };
  },

  onHistoryUpdated: (callback: (history: HistoryItem[]) => void) => {
    const handler = (_evt: any, history: HistoryItem[]) => callback(history);
    ipcRenderer.on(IPC_CHANNELS.EVENT_HISTORY_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_HISTORY_UPDATED, handler);
    };
  },

  onBookmarksUpdated: (callback: (bookmarks: Bookmark[]) => void) => {
    const handler = (_evt: any, bookmarks: Bookmark[]) => callback(bookmarks);
    ipcRenderer.on(IPC_CHANNELS.EVENT_BOOKMARKS_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_BOOKMARKS_UPDATED, handler);
    };
  },

  onSettingsUpdated: (callback: (settings: BrowserSettings) => void) => {
    const handler = (_evt: any, settings: BrowserSettings) => callback(settings);
    ipcRenderer.on(IPC_CHANNELS.EVENT_SETTINGS_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_SETTINGS_UPDATED, handler);
    };
  },
};

// Legacy electronAPI bridge for agent backwards compatibility
const electronAPI: ElectronAPI = {
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_VERSION),
  minimize: () => ipcRenderer.send(IPC_CHANNELS.MINIMIZE),
  maximize: () => ipcRenderer.send(IPC_CHANNELS.MAXIMIZE),
  close: () => ipcRenderer.send(IPC_CHANNELS.CLOSE),

  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),

  startTask: (goal: string) => ipcRenderer.invoke(IPC_CHANNELS.START_TASK, goal),
  cancelTask: (taskId: string) => ipcRenderer.invoke(IPC_CHANNELS.CANCEL_TASK, taskId),
  respondApproval: (requestId: string, approved: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.APPROVAL_RESPONSE, requestId, approved),

  takeoverBrowser: (takeover: boolean) => ipcRenderer.invoke(IPC_CHANNELS.TAKEOVER_BROWSER, takeover),
  navigateBrowser: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.NAVIGATE_BROWSER, url),
  reloadBrowser: () => ipcRenderer.invoke(IPC_CHANNELS.RELOAD_BROWSER),

  getTaskHistory: () => ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY),
  getTaskDetails: (taskId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_TASK_DETAILS, taskId),
  openArtifact: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_ARTIFACT, filePath),
  getArtifactContent: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_ARTIFACT_CONTENT, filePath),

  onPlanUpdated: (callback: (plan: ExecutionPlan) => void) => {
    const handler = (_event: any, plan: ExecutionPlan) => callback(plan);
    ipcRenderer.on(IPC_CHANNELS.EVENT_PLAN_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_PLAN_UPDATED, handler);
    };
  },

  onStepUpdated: (callback: (step: PlanStep) => void) => {
    const handler = (_event: any, step: PlanStep) => callback(step);
    ipcRenderer.on(IPC_CHANNELS.EVENT_STEP_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_STEP_UPDATED, handler);
    };
  },

  onLogAdded: (callback: (log: ActionLogItem) => void) => {
    const handler = (_event: any, log: ActionLogItem) => callback(log);
    ipcRenderer.on(IPC_CHANNELS.EVENT_LOG_ADDED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_LOG_ADDED, handler);
    };
  },

  onTaskStatusChanged: (
    callback: (data: {
      taskId: string;
      status: TaskStatus;
      verificationStatus: VerificationStatus;
      report?: VerificationReport;
      taskRecord?: TaskRecord;
    }) => void
  ) => {
    const handler = (
      _event: any,
      data: {
        taskId: string;
        status: TaskStatus;
        verificationStatus: VerificationStatus;
        report?: VerificationReport;
        taskRecord?: TaskRecord;
      }
    ) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.EVENT_STATUS_CHANGED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_STATUS_CHANGED, handler);
    };
  },

  onApprovalRequested: (callback: (request: ApprovalRequest) => void) => {
    const handler = (_event: any, request: ApprovalRequest) => callback(request);
    ipcRenderer.on(IPC_CHANNELS.EVENT_APPROVAL_REQUEST, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_APPROVAL_REQUEST, handler);
    };
  },

  onBrowserStateChanged: (callback: (data: BrowserState) => void) => {
    const handler = (_event: any, data: BrowserState) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.EVENT_BROWSER_STATE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.EVENT_BROWSER_STATE, handler);
    };
  },
};

contextBridge.exposeInMainWorld('adalNexus', adalNexus);
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
