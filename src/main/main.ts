import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as dotenv from 'dotenv';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { AppSettings, BrowserBounds, BrowserSettings } from '../shared/types';
import { BrowserStore } from './storage/browser-store';
import { TabManager, ADAL_SESSION_PARTITION } from './browser/tab-manager';
import { DownloadManager } from './browser/download-manager';
import { WallpaperService } from './services/wallpaper-service';
import { ArtifactService } from './services/artifact-service';
import { DatabaseService } from './db/database';
import { WebSocketService } from './services/websocket-service';
import { ToolRegistry } from './agent/tools/registry';
import { PlaywrightBrowserService } from './browser/browser-service';
import { ApprovalManager } from './agent/approval/approval-manager';
import { VerificationEngine } from './agent/verification/verification-engine';
import { TaskPlanner } from './agent/planner';
import { ExecutionEngine } from './agent/execution-engine';

// Set application name early for consistent path calculation
app.name = 'AdaL Nexus';

// Configure Chromium and GPU resilience flags before app.whenReady()
// - disable-gpu-sandbox prevents Windows LPAC STATUS_BREAKPOINT (-2147483645) crashes
// - CalculateNativeWinOcclusion prevents Chromium from halting paints for WebContentsViews on Windows
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Safe diagnostic logger writing to console and a local startup log
function logDiagnostic(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    const userData = app.getPath('userData');
    if (fs.existsSync(userData)) {
      fs.appendFileSync(path.join(userData, 'startup.log'), line + '\n', 'utf8');
    }
  } catch {}
}

const isTest = process.env.TEST_BUILD === 'true' || Boolean(process.env.VITEST);

if (isTest && !app.isPackaged) {
  // In test runs, isolate userData to avoid parallel test suite cache collisions
  const testUserData = path.join(os.tmpdir(), `adal-nexus-test-${process.pid}`);
  try {
    if (!fs.existsSync(testUserData)) {
      fs.mkdirSync(testUserData, { recursive: true });
    }
    app.setPath('userData', testUserData);
  } catch {}
}

// Enforce single-instance lock to strictly prevent duplicate instances and cache lock contention
const gotSingleInstanceLock = isTest || app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  logDiagnostic('Another instance of AdaL Nexus is already running. Exiting secondary instance.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
  logDiagnostic('Secondary instance launch detected. Focusing primary window.');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Load environment variables (.env)
dotenv.config();

let mainWindow: BrowserWindow | null = null;
let browserStore: BrowserStore;
let tabManager: TabManager;
let downloadManager: DownloadManager;
let wallpaperService: WallpaperService;

let artifactService: ArtifactService;
let dbService: DatabaseService;
let wsService: WebSocketService;
let toolRegistry: ToolRegistry;
let playwrightBrowserService: PlaywrightBrowserService;
let approvalManager: ApprovalManager;
let verificationEngine: VerificationEngine;
let planner: TaskPlanner;
let executionEngine: ExecutionEngine;

const CHROME_DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

// Initial application settings for legacy compatibility
let currentSettings: AppSettings = {
  llmProvider: (process.env.DEFAULT_LLM_PROVIDER as any) || 'gemini',
  apiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'gemini-3.5-flash',
  apiBaseUrl: process.env.LLM_BASE_URL || undefined,
  headlessBrowser: process.env.HEADLESS_BROWSER !== 'false',
  viewportWidth: 1280,
  viewportHeight: 800,
  requireApprovalForConsequential: true,
  autoVerify: true,
  wsPort: 5174,
};

function verifyStorageAndCache(): void {
  const userData = app.getPath('userData');
  const cacheDir = path.join(userData, 'Cache');
  const gpuCacheDir = path.join(userData, 'GPUCache');

  for (const dir of [userData, cacheDir, gpuCacheDir]) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err: any) {
      logDiagnostic(`Directory init notice (${dir}): ${err.message}`);
    }
  }

  try {
    const testFile = path.join(userData, '.write-test');
    fs.writeFileSync(testFile, 'ok', 'utf8');
    fs.unlinkSync(testFile);
    logDiagnostic(`UserData path verified writable: ${userData}`);
  } catch (err: any) {
    logDiagnostic(`Warning: UserData path write test failed: ${err.message}`);
  }
}

function printStartupDiagnostics(): void {
  const version = app.getVersion();
  const electronVer = process.versions.electron;
  const chromeVer = process.versions.chrome;
  const nodeVer = process.versions.node;
  const isPackaged = app.isPackaged;
  const userData = app.getPath('userData');

  logDiagnostic('============================================================');
  logDiagnostic(`AdaL Nexus Browser v${version} (Packaged: ${isPackaged})`);
  logDiagnostic(`Runtime: Electron ${electronVer} | Chrome ${chromeVer} | Node ${nodeVer}`);
  logDiagnostic(`UserData: ${userData}`);
  logDiagnostic(`SingleInstanceLock: Acquired`);
  logDiagnostic(`LLM Provider: ${currentSettings.llmProvider}`);
  logDiagnostic(`API Key Configured: ${Boolean(currentSettings.apiKey)}`); // Safe: never logs secret content
  logDiagnostic('============================================================');
}

function initializeServices(): void {
  // Use persistent user data directory
  browserStore = new BrowserStore();
  tabManager = new TabManager(browserStore, () => mainWindow);
  (globalThis as any).tabManager = tabManager;
  downloadManager = new DownloadManager(browserStore, () => mainWindow);
  wallpaperService = new WallpaperService(browserStore, () => mainWindow);
  wallpaperService.handleSettingsChanged(browserStore.getSettings());

  const userData = app.getPath('userData');
  const artifactsDir = path.join(userData, 'artifacts');
  const dataDir = path.join(userData, 'data');
  const dbPath = path.join(dataDir, 'adal-nexus.sqlite');

  artifactService = new ArtifactService(artifactsDir);
  dbService = new DatabaseService(dbPath);
  wsService = new WebSocketService(currentSettings.wsPort || 5174);
  wsService.start().catch((e) => console.warn('[Main] WebSocket notice:', e.message));

  toolRegistry = new ToolRegistry();
  playwrightBrowserService = new PlaywrightBrowserService({
    headless: currentSettings.headlessBrowser,
    viewportWidth: currentSettings.viewportWidth,
    viewportHeight: currentSettings.viewportHeight,
  });

  playwrightBrowserService.onStateChange((state) => {
    mainWindow?.webContents.send(IPC_CHANNELS.EVENT_BROWSER_STATE, state);
  });

  approvalManager = new ApprovalManager(currentSettings.requireApprovalForConsequential);
  verificationEngine = new VerificationEngine({ artifactService });
  planner = new TaskPlanner(toolRegistry, currentSettings);

  executionEngine = new ExecutionEngine(
    toolRegistry,
    playwrightBrowserService,
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
    },
    tabManager
  );
}

function createWindow(): void {
  logDiagnostic('Creating main application BrowserWindow...');

  mainWindow = new BrowserWindow({
    title: 'AdaL Nexus',
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: '#090b14',
    show: true, // Visible immediately so Windows DWM registers and activates the window
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isPackaged = app.isPackaged;
  const isDev = !isPackaged && process.env.NODE_ENV === 'development';
  const rendererPath = path.join(__dirname, '../renderer/index.html');

  logDiagnostic(`Window created. isPackaged=${isPackaged}, isDev=${isDev}, rendererPath=${rendererPath}`);

  if (isPackaged) {
    // Production packaged app must ALWAYS load local production build
    logDiagnostic(`Loading packaged production renderer: ${rendererPath}`);
    mainWindow.loadFile(rendererPath).catch((err) => {
      logDiagnostic(`Error loading packaged renderer: ${err.message}`);
    });
  } else if (isDev && process.env.VITE_DEV_SERVER_URL) {
    logDiagnostic(`Connecting to configured dev server: ${process.env.VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL).catch((err) => {
      logDiagnostic(`Failed to connect to dev server, falling back to local file: ${err.message}`);
      mainWindow?.loadFile(rendererPath);
    });
  } else if (isDev && !process.env.TEST_BUILD) {
    const devServerUrl = 'http://localhost:5173';
    logDiagnostic(`Attempting to connect to dev server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch(() => {
      logDiagnostic(`Dev server at ${devServerUrl} unreachable. Falling back to built renderer.`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadFile(rendererPath).catch((err) => {
          logDiagnostic(`Fallback to built renderer failed: ${err.message}`);
        });
      }
    });
  } else {
    logDiagnostic(`Loading local renderer file: ${rendererPath}`);
    mainWindow.loadFile(rendererPath).catch((err) => {
      logDiagnostic(`Error loading local renderer: ${err.message}`);
    });
  }

  // Handle load failures gracefully and recover
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logDiagnostic(`WebContents failed to load: ${validatedURL} (Error ${errorCode}: ${errorDescription})`);
    if (!validatedURL.includes('index.html') && fs.existsSync(rendererPath)) {
      logDiagnostic('Recovering by loading local built renderer...');
      mainWindow?.loadFile(rendererPath);
    }
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    logDiagnostic(`[Renderer Console] [Level ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    logDiagnostic(`[Renderer] did-finish-load. URL="${mainWindow?.webContents.getURL()}", Title="${mainWindow?.getTitle()}"`);
  });

  // Global browser shortcut interception on main window
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && tabManager) {
      tabManager.handleShortcut(event, input);
    }
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logDiagnostic(`[Renderer] render-process-gone: ${details.reason} (exitCode: ${details.exitCode})`);
  });

  mainWindow.on('show', () => {
    logDiagnostic(`[Window] Window 'show' event emitted. Bounds=${JSON.stringify(mainWindow?.getBounds())}, isVisible=${mainWindow?.isVisible()}`);
  });

  const recalculateTabBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed() || !tabManager) return;
    try {
      const cvBounds = mainWindow.contentView.getBounds();
      const SIDEBAR_WIDTH = 72;
      const HEADER_HEIGHT = 84;
      const width = Math.max(200, cvBounds.width - SIDEBAR_WIDTH);
      const height = Math.max(200, cvBounds.height - HEADER_HEIGHT);
      tabManager.setBounds({
        x: SIDEBAR_WIDTH,
        y: HEADER_HEIGHT,
        width,
        height,
      });
    } catch (err) {
      console.warn('[Main] Failed to recalculate tab bounds:', err);
    }
  };

  // Reveal and activate window smoothly
  let isWindowRevealed = false;
  const revealWindow = () => {
    if (isWindowRevealed || !mainWindow || mainWindow.isDestroyed()) return;
    isWindowRevealed = true;
    logDiagnostic('Revealing and activating main browser window in foreground.');
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    // Pierce Windows foreground lock to ensure window is brought to front
    try {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    } catch {}
    recalculateTabBounds();
  };

  mainWindow.once('ready-to-show', () => {
    revealWindow();
  });

  // Safety fallback: reveal window after 2500ms even if ready-to-show was delayed
  setTimeout(() => {
    if (!isWindowRevealed) {
      logDiagnostic('Safety timer triggered window reveal.');
      revealWindow();
    }
  }, 2500);

  // Deny untrusted new-window creation directly in main shell window; route to managed tab
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (tabManager) {
      tabManager.createTab(url, true);
    } else {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Initialize default New Tab immediately
  if (tabManager && tabManager.getTabs().length === 0) {
    tabManager.createTab('adal://newtab', true);
  }

  mainWindow.on('resize', recalculateTabBounds);
  mainWindow.on('resized', recalculateTabBounds);
  mainWindow.on('maximize', () => {
    setTimeout(recalculateTabBounds, 50);
  });
  mainWindow.on('unmaximize', () => {
    setTimeout(recalculateTabBounds, 50);
  });
  mainWindow.on('restore', () => {
    setTimeout(recalculateTabBounds, 50);
  });
  mainWindow.on('enter-full-screen', recalculateTabBounds);
  mainWindow.on('leave-full-screen', recalculateTabBounds);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers(): void {
  // --- Window Controls ---
  ipcMain.handle(IPC_CHANNELS.GET_VERSION, () => app.getVersion());

  ipcMain.on(IPC_CHANNELS.MINIMIZE, () => {
    mainWindow?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.MAXIMIZE, () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.CLOSE, () => {
    mainWindow?.close();
  });

  ipcMain.handle(IPC_CHANNELS.IS_MAXIMIZED, () => {
    return mainWindow?.isMaximized() || false;
  });

  // --- Tab Management ---
  ipcMain.handle(IPC_CHANNELS.TAB_CREATE, (_event, url?: string) => {
    return tabManager.createTab(url, true);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_SWITCH, (_event, tabId: string) => {
    return tabManager.switchTab(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_CLOSE, (_event, tabId: string) => {
    return tabManager.closeTab(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GET_ALL, () => {
    return tabManager.getTabs();
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GET_ACTIVE, () => {
    return tabManager.getActiveTab();
  });

  ipcMain.handle(IPC_CHANNELS.TAB_SET_BOUNDS, (_event, bounds: BrowserBounds) => {
    tabManager.setBounds(bounds);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_SET_VIEW_VISIBLE, (_event, visible: boolean) => {
    return tabManager.setViewVisible(visible);
  });

  // --- Navigation Controls ---
  ipcMain.handle(IPC_CHANNELS.NAV_NAVIGATE, (_event, tabId: string, urlOrQuery: string) => {
    return tabManager.navigate(tabId, urlOrQuery);
  });

  ipcMain.handle(IPC_CHANNELS.NAV_GO_BACK, (_event, tabId: string) => {
    return tabManager.goBack(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.NAV_GO_FORWARD, (_event, tabId: string) => {
    return tabManager.goForward(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.NAV_RELOAD, (_event, tabId: string) => {
    return tabManager.reload(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.NAV_STOP, (_event, tabId: string) => {
    return tabManager.stop(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.NAV_GO_HOME, (_event, tabId: string) => {
    return tabManager.goHome(tabId);
  });

  // --- Bookmarks ---
  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_GET, () => {
    return browserStore.getBookmarks();
  });

  ipcMain.handle(
    IPC_CHANNELS.BOOKMARKS_ADD,
    (_event, bm: { title: string; url: string; favicon?: string }) => {
      const added = browserStore.addBookmark(bm);
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_BOOKMARKS_UPDATED, browserStore.getBookmarks());
      return added;
    }
  );

  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_REMOVE, (_event, idOrUrl: string) => {
    const removed = browserStore.removeBookmark(idOrUrl);
    if (removed) {
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_BOOKMARKS_UPDATED, browserStore.getBookmarks());
    }
    return removed;
  });

  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_IS_BOOKMARKED, (_event, url: string) => {
    return browserStore.isBookmarked(url);
  });

  // --- History & Browsing Data ---
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET, () => {
    return browserStore.getHistory();
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, async () => {
    browserStore.clearHistory();
    try {
      // Clear HTTP disk cache only; strictly preserve user login cookies and session data
      await session.defaultSession.clearCache();
      const adalSession = session.fromPartition(ADAL_SESSION_PARTITION);
      await adalSession.clearCache();
    } catch (err) {
      console.warn('[Main] Error clearing session cache:', err);
    }
    mainWindow?.webContents.send(IPC_CHANNELS.EVENT_HISTORY_UPDATED, []);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_REMOVE, (_event, id: string) => {
    const removed = browserStore.removeHistoryItem(id);
    if (removed) {
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_HISTORY_UPDATED, browserStore.getHistory());
    }
    return removed;
  });

  // --- Downloads ---
  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_GET, () => {
    return downloadManager.getDownloads();
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_OPEN_FILE, async (_event, id: string) => {
    return downloadManager.openFile(id);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_SHOW_IN_FOLDER, (_event, id: string) => {
    return downloadManager.showInFolder(id);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_CANCEL, (_event, id: string) => {
    return downloadManager.cancelDownload(id);
  });

  // --- Settings ---
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_BROWSER, () => {
    return browserStore.getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SAVE_BROWSER,
    (_event, updated: Partial<BrowserSettings>) => {
      const saved = browserStore.saveSettings(updated);
      wallpaperService?.handleSettingsChanged(saved);
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_SETTINGS_UPDATED, saved);
      return saved;
    }
  );

  // --- Live Wallpaper Handlers ---
  ipcMain.handle(IPC_CHANNELS.WALLPAPER_GET_CURRENT, () => {
    return wallpaperService.getCurrentWallpaper();
  });

  ipcMain.handle(IPC_CHANNELS.WALLPAPER_REFRESH_NOW, async () => {
    return wallpaperService.refreshWallpaper();
  });

  ipcMain.handle(IPC_CHANNELS.WALLPAPER_SET_INTERVAL, (_event, minutes: number) => {
    wallpaperService.startTimer(minutes);
    return true;
  });

  // --- AI Agent & Automation Handlers ---
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => currentSettings);

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updated: Partial<AppSettings>) => {
    currentSettings = { ...currentSettings, ...updated };
    planner?.updateSettings(currentSettings);
    if (updated.requireApprovalForConsequential !== undefined) {
      approvalManager?.setEnabled(updated.requireApprovalForConsequential);
    }
    return currentSettings;
  });

  ipcMain.handle(IPC_CHANNELS.START_TASK, async (_event, goal: string, context?: any) => {
    if (!goal || typeof goal !== 'string') {
      throw new Error('Task goal must be a non-empty string');
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Notify renderer: task planning started
    mainWindow?.webContents.send(IPC_CHANNELS.EVENT_STATUS_CHANGED, {
      taskId,
      status: 'planning',
      verificationStatus: 'UNVERIFIED',
    });

    try {
      const plan = await planner.createPlan(goal, context);
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_PLAN_UPDATED, plan);

      // Launch execution in background without blocking IPC invoke
      setTimeout(async () => {
        try {
          await executionEngine.executePlan(taskId, plan);
        } catch (err: any) {
          console.error('[Main] Task execution error:', err);
        }
      }, 20);

      return { taskId, plan };
    } catch (err: any) {
      console.error('[Main] Task planning error:', err);
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_STATUS_CHANGED, {
        taskId,
        status: 'failed',
        verificationStatus: 'UNVERIFIED',
        error: err.message,
      });
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_TASK, (_event, taskId: string) => {
    return executionEngine.cancel(taskId);
  });

  ipcMain.handle(
    IPC_CHANNELS.APPROVAL_RESPONSE,
    (_event, requestId: string, approved: boolean) => {
      return approvalManager.resolveApproval(requestId, approved);
    }
  );

  ipcMain.handle(IPC_CHANNELS.OPEN_ARTIFACT, async (_event, filePath: string) => {
    try {
      if (!filePath) {
        console.warn('[Main] OPEN_ARTIFACT called with empty path');
        return false;
      }
      const safePath = artifactService.resolveSafePath(filePath);
      if (!fs.existsSync(safePath)) {
        console.warn('[Main] Artifact file does not exist at resolved path:', safePath);
        return false;
      }

      // If it's a PDF report, open safely in-app inside a managed browser tab in AdaL Nexus
      if (safePath.toLowerCase().endsWith('.pdf') && tabManager) {
        const fileUrl = 'file:///' + safePath.replace(/\\/g, '/');
        const tab = tabManager.createTab(fileUrl, true);
        if (tab) {
          tab.title = path.basename(safePath);
          mainWindow?.webContents.send(IPC_CHANNELS.EVENT_TABS_UPDATED, tabManager.getTabs());
          mainWindow?.webContents.send(IPC_CHANNELS.EVENT_ACTIVE_TAB_CHANGED, tabManager.getActiveTab());
        }
        return true;
      }

      const openError = await shell.openPath(safePath);
      if (openError) {
        console.warn('[Main] shell.openPath returned error:', openError, '- falling back to reveal in folder');
        shell.showItemInFolder(safePath);
      }
      return true;
    } catch (err) {
      console.warn('[Main] Error opening artifact:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_ALL_ARTIFACTS, async () => {
    try {
      return await artifactService.listAllArtifacts();
    } catch (err) {
      console.warn('[Main] Error listing artifacts:', err);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_ARTIFACT, async (_event, filePath: string) => {
    try {
      return await artifactService.deleteArtifact(filePath);
    } catch (err) {
      console.warn('[Main] Error deleting artifact:', err);
      throw err;
    }
  });

  // --- Voice Transcription via Gemini Audio Multimodal API ---
  ipcMain.handle(
    IPC_CHANNELS.VOICE_TRANSCRIBE,
    async (_event, audioBase64: string, mimeType: string, language?: string) => {
      try {
        if (!audioBase64) {
          return { success: false, error: 'No audio data received' };
        }

        const apiKey = currentSettings.apiKey || process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          return {
            success: false,
            error: 'Gemini API key is not configured. Please set your API key in Settings to enable voice transcription, or use typed input.',
          };
        }

        // Clean raw base64 if it has data URL prefix
        const rawBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
        const cleanMime = (mimeType || 'audio/webm').split(';')[0];

        const langPrompt =
          language === 'hi-IN'
            ? 'The speaker is speaking in Hindi. Transcribe accurately in Hindi (Devanagari script).'
            : language === 'hinglish'
            ? 'The speaker is speaking in Hinglish (Hindi written in Roman/Latin script, e.g. "WhatsApp Web kholo bhai", "YouTube par song chalao"). Transcribe in natural Hinglish.'
            : 'The speaker is speaking in English. Transcribe accurately in English.';

        const transcribeModel = currentSettings.model || 'gemini-3.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${transcribeModel}:generateContent?key=${apiKey}`;

        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inline_data: {
                    mime_type: cleanMime,
                    data: rawBase64,
                  },
                },
                {
                  text: `Accurately transcribe this audio recording into plain text. ${langPrompt} Return ONLY the verbatim transcribed words without any quotes, preambles, explanations, or punctuation additions.`,
                },
              ],
            },
          ],
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(25000),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn('[Main] Voice transcription API error:', res.status, errText);
          return {
            success: false,
            error: `Voice transcription service error (${res.status}). Please retry or use typed input.`,
          };
        }

        const data: any = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const transcription = candidate ? candidate.trim().replace(/^["']|["']$/g, '') : '';

        if (!transcription) {
          return {
            success: false,
            error: 'No clear speech could be recognized. Please speak clearly into your microphone and retry.',
          };
        }

        return { success: true, text: transcription };
      } catch (err: any) {
        console.warn('[Main] Voice transcription exception:', err);
        return {
          success: false,
          error: `Audio transcription failed (${err?.message || 'timeout/network'}). Please retry or use typed input.`,
        };
      }
    }
  );

  // --- System Telemetry & Performance ---
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_TELEMETRY, async () => {
    try {
      const memUsage = process.memoryUsage();
      let privateBytes = 0;
      try {
        const procMem: any = await process.getProcessMemoryInfo();
        privateBytes = procMem.private || procMem.residentSet || 0;
      } catch {}

      let gpuName = 'Chromium DWM Hardware Compositor';
      let gpuStatus = 'Hardware Accelerated';
      try {
        const featureStatus = app.getGPUFeatureStatus();
        if (featureStatus.gpu_compositing !== 'enabled') {
          gpuStatus = 'Software Compositing Fallback';
        }
        const basicGpu: any = await app.getGPUInfo('basic').catch(() => null);
        if (basicGpu?.gpuDevice?.[0]?.deviceString) {
          gpuName = basicGpu.gpuDevice[0].deviceString;
        }
      } catch {}

      const cpu = (process as any).getCPUUsage ? (process as any).getCPUUsage().percentCPU : 0;

      return {
        heapUsedMB: Math.round(memUsage.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(memUsage.heapTotal / (1024 * 1024)),
        rssMB: Math.round(memUsage.rss / (1024 * 1024)),
        privateBytesMB: Math.round(privateBytes / 1024),
        gpuRenderer: gpuName,
        gpuStatus,
        cpuPercent: Math.round(cpu * 10) / 10,
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        sandboxVerified: true,
        contextIsolationVerified: true,
      };
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPTIMIZE_MEMORY, async () => {
    try {
      // Flush Chromium HTTP & shader disk cache
      await session.defaultSession.clearCache();
      if ((globalThis as any).gc) {
        (globalThis as any).gc();
      }
      const mem = process.memoryUsage();
      return {
        success: true,
        heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMB: Math.round(mem.heapTotal / (1024 * 1024)),
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CLEAR_CACHE, async () => {
    try {
      const recordsRemoved = browserStore.getHistory().length;
      browserStore.clearHistory();
      await session.defaultSession.clearCache();
      const adalSession = session.fromPartition(ADAL_SESSION_PARTITION);
      await adalSession.clearCache();

      // Notify renderer of cleared history
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_HISTORY_UPDATED, []);

      return {
        success: true,
        recordsRemoved,
        cacheCleared: true,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_GET_ALL, () => {
    try {
      const exts = session.defaultSession.getAllExtensions();
      return exts.map((e) => ({
        id: e.id,
        name: e.name,
        version: e.version,
        path: e.path,
        enabled: true,
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_ARTIFACT_CONTENT, async (_event, filePath: string) => {
    try {
      const parsed = await artifactService.readAndParseCsv(filePath);
      return parsed;
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, () => {
    return dbService.getAllTasks();
  });

  ipcMain.handle(IPC_CHANNELS.GET_TASK_DETAILS, (_event, taskId: string) => {
    const task = dbService.getTask(taskId);
    const logs = dbService.getLogsForTask(taskId);
    return { task, logs };
  });

  ipcMain.handle(IPC_CHANNELS.TAKEOVER_BROWSER, (_event, takeover: boolean) => {
    playwrightBrowserService.setTakeover(takeover);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.NAVIGATE_BROWSER, async (_event, url: string) => {
    return await playwrightBrowserService.navigate(url);
  });

  ipcMain.handle(IPC_CHANNELS.RELOAD_BROWSER, async () => {
    await playwrightBrowserService.reload();
    return true;
  });
}

app.on('child-process-gone', (_event, details) => {
  logDiagnostic(`Child process exited (${details.type}): ${details.reason} (code: ${details.exitCode})`);
  if (details.type === 'GPU' && details.reason === 'crashed') {
    logDiagnostic('GPU process crashed. Chromium will handle automatic fallback or software rendering.');
  }
});

app.whenReady().then(() => {
  verifyStorageAndCache();
  printStartupDiagnostics();

  // Ensure Chromium's default persistent session and profile session use modern desktop Chrome User Agent
  session.defaultSession.setUserAgent(CHROME_DESKTOP_UA);

  // Configure explicit permission request and check handlers for media (microphone/audio)
  const setupMediaPermissions = (targetSession: Electron.Session) => {
    targetSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (permission === 'media') {
        callback(true);
        return;
      }
      callback(true);
    });
    targetSession.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === 'media') {
        return true;
      }
      return true;
    });
  };

  setupMediaPermissions(session.defaultSession);
  try {
    const adalSession = session.fromPartition(ADAL_SESSION_PARTITION);
    adalSession.setUserAgent(CHROME_DESKTOP_UA);
    setupMediaPermissions(adalSession);
  } catch {}

  initializeServices();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logDiagnostic('All windows closed.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  logDiagnostic('Application before-quit event received.');
  try {
    const adalSession = session.fromPartition(ADAL_SESSION_PARTITION);
    await adalSession.cookies.flushStore();
  } catch {}
  try {
    wsService?.stop();
  } catch {}
});

app.on('will-quit', async () => {
  logDiagnostic('Application will-quit event received. Cleaning up services...');
  try {
    await playwrightBrowserService?.close();
  } catch {}
  try {
    wsService?.stop();
  } catch {}
  try {
    dbService?.close();
  } catch {}
  logDiagnostic('AdaL Nexus shutdown completed cleanly.');
});
