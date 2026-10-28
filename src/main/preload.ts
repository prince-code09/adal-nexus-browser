import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type {
  AppSettings,
  ElectronAPI,
  ExecutionPlan,
  PlanStep,
  ActionLogItem,
  ApprovalRequest,
  TaskRecord,
  TaskStatus,
  VerificationStatus,
  BrowserState,
  VerificationReport,
} from '../shared/types';

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

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
