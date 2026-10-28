import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { AppSettings, TaskRecord, ExecutionPlan, ActionLogItem, BrowserState } from '../shared/types';
import { ArtifactService } from './services/artifact-service';
import { DatabaseService } from './db/database';
import { WebSocketService } from './services/websocket-service';
import { PlaywrightBrowserService } from './browser/browser-service';
import { ToolRegistry } from './agent/tools/registry';
import { ApprovalManager } from './agent/approval/approval-manager';
import { VerificationEngine } from './agent/verification/verification-engine';
import { TaskPlanner } from './agent/planner';
import { ExecutionEngine } from './agent/execution-engine';

// Load environment variables (.env)
dotenv.config();

let mainWindow: BrowserWindow | null = null;

// Initial application settings
let currentSettings: AppSettings = {
  llmProvider: (process.env.DEFAULT_LLM_PROVIDER as any) || 'mock',
  apiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'gemini-1.5-pro-latest',
  apiBaseUrl: process.env.LLM_BASE_URL || undefined,
  headlessBrowser: process.env.HEADLESS_BROWSER === 'true' || false,
  viewportWidth: 1280,
  viewportHeight: 800,
  requireApprovalForConsequential: true,
  autoVerify: true,
  wsPort: 5174,
};

// Data & Settings directories
const userDataPath = app.getPath('userData');
const settingsFilePath = path.join(userDataPath, 'adal-nexus-settings.json');
const artifactsDir = path.resolve(process.cwd(), 'artifacts');

function loadSavedSettings() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
      currentSettings = { ...currentSettings, ...data };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function saveCurrentSettings(newSettings: Partial<AppSettings>): AppSettings {
  currentSettings = { ...currentSettings, ...newSettings };
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(currentSettings, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
  return currentSettings;
}

// Module singletons
let artifactService: ArtifactService;
let dbService: DatabaseService;
let wsService: WebSocketService;
let browserService: PlaywrightBrowserService;
let toolRegistry: ToolRegistry;
let approvalManager: ApprovalManager;
let verificationEngine: VerificationEngine;
let taskPlanner: TaskPlanner;
let executionEngine: ExecutionEngine;

function initializeModules() {
  artifactService = new ArtifactService(artifactsDir);
  dbService = new DatabaseService();
  wsService = new WebSocketService(currentSettings.wsPort || 5174);
  wsService.start().catch((err) => console.warn('[Main] WebSocket server init:', err));

  browserService = new PlaywrightBrowserService({
    headless: currentSettings.headlessBrowser,
    viewportWidth: currentSettings.viewportWidth,
    viewportHeight: currentSettings.viewportHeight,
  });

  browserService.onStateChange((state: BrowserState) => {
    mainWindow?.webContents.send(IPC_CHANNELS.EVENT_BROWSER_STATE, state);
    wsService.broadcast('browser:state', state);
  });

  toolRegistry = new ToolRegistry();
  approvalManager = new ApprovalManager(currentSettings.requireApprovalForConsequential);
  verificationEngine = new VerificationEngine({ artifactService });
  taskPlanner = new TaskPlanner(toolRegistry, currentSettings);

  executionEngine = new ExecutionEngine(
    toolRegistry,
    browserService,
    artifactService,
    approvalManager,
    verificationEngine,
    dbService,
    wsService,
    {
      onStatusChanged: (data) => {
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_STATUS_CHANGED, data);
      },
      onPlanUpdated: (plan) => {
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_PLAN_UPDATED, plan);
      },
      onStepUpdated: (step) => {
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_STEP_UPDATED, step);
      },
      onLogAdded: (log) => {
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_LOG_ADDED, log);
      },
      onApprovalRequested: (request) => {
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_APPROVAL_REQUEST, request);
      },
    }
  );
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090d16',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev && !process.env.TEST_BUILD) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      setTimeout(() => {
        if (mainWindow) mainWindow.loadURL(devServerUrl);
      }, 1500);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.GET_VERSION, () => app.getVersion());

  ipcMain.on(IPC_CHANNELS.MINIMIZE, () => {
    mainWindow?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.CLOSE, () => {
    mainWindow?.close();
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => currentSettings);

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updated: Partial<AppSettings>) => {
    const saved = saveCurrentSettings(updated);
    taskPlanner.updateSettings(saved);
    approvalManager.setRequireApproval(saved.requireApprovalForConsequential);
    return saved;
  });

  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, () => {
    return dbService.getAllTasks();
  });

  ipcMain.handle(IPC_CHANNELS.GET_TASK_DETAILS, (_event, taskId: string) => {
    return dbService.getTask(taskId);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_ARTIFACT, async (_event, filePath: string) => {
    try {
      const fullPath = artifactService.resolveSafePath(filePath);
      if (fs.existsSync(fullPath)) {
        await shell.openPath(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_ARTIFACT_CONTENT, async (_event, filePath: string) => {
    try {
      const parsed = await artifactService.readAndParseCsv(filePath);
      return { content: parsed.rawContent, parsed };
    } catch (err: any) {
      return { content: '', error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.START_TASK, async (_event, goal: string) => {
    const taskId = `task-${Date.now()}`;

    // Run async in background without blocking IPC invoke return
    (async () => {
      try {
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_STATUS_CHANGED, {
          taskId,
          status: 'planning',
          verificationStatus: 'UNVERIFIED',
        });

        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_LOG_ADDED, {
          id: `log-${Date.now()}-plan-start`,
          timestamp: Date.now(),
          level: 'info',
          title: 'Planning Task',
          details: `Analyzing goal: "${goal}" and selecting authorized tools...`,
        });

        // 1. Generate Structured Plan
        const plan = await taskPlanner.createPlan(goal);
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_PLAN_UPDATED, plan);
        wsService.broadcast('plan:updated', plan);

        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_LOG_ADDED, {
          id: `log-${Date.now()}-plan-ready`,
          timestamp: Date.now(),
          level: 'info',
          title: 'Plan Ready',
          details: `Generated ${plan.steps.length}-step structured execution plan: "${plan.summary}"`,
        });

        // 2. Execute Plan & Verify
        await executionEngine.executePlan(taskId, plan);
      } catch (err: any) {
        console.error('[Main] Task execution error:', err);
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_LOG_ADDED, {
          id: `log-${Date.now()}-err`,
          timestamp: Date.now(),
          level: 'error',
          title: 'Task Execution Failed',
          details: err?.message || String(err),
        });
        mainWindow?.webContents.send(IPC_CHANNELS.EVENT_STATUS_CHANGED, {
          taskId,
          status: 'failed',
          verificationStatus: 'FAILED',
        });
      }
    })();

    return { taskId };
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_TASK, async (_event, taskId: string) => {
    return executionEngine.cancel(taskId);
  });

  ipcMain.handle(IPC_CHANNELS.APPROVAL_RESPONSE, async (_event, requestId: string, approved: boolean) => {
    approvalManager.resolveApproval(requestId, approved);
  });

  ipcMain.handle(IPC_CHANNELS.TAKEOVER_BROWSER, async (_event, takeover: boolean) => {
    browserService.setTakeover(takeover);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.NAVIGATE_BROWSER, async (_event, url: string) => {
    await browserService.navigate(url);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.RELOAD_BROWSER, async () => {
    await browserService.reload();
    return true;
  });
}

app.whenReady().then(() => {
  loadSavedSettings();
  initializeModules();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (browserService) {
    await browserService.close().catch(() => {});
  }
  if (wsService) {
    wsService.stop();
  }
  if (dbService) {
    dbService.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
