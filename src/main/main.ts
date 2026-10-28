import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { AppSettings, BrowserBounds, BrowserSettings } from '../shared/types';
import { BrowserStore } from './storage/browser-store';
import { TabManager } from './browser/tab-manager';
import { DownloadManager } from './browser/download-manager';

// Load environment variables (.env)
dotenv.config();

let mainWindow: BrowserWindow | null = null;
let browserStore: BrowserStore;
let tabManager: TabManager;
let downloadManager: DownloadManager;

const CHROME_DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

// Initial application settings for legacy compatibility
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

function initializeServices(): void {
  // Use persistent user data directory
  browserStore = new BrowserStore();
  tabManager = new TabManager(browserStore, () => mainWindow);
  downloadManager = new DownloadManager(browserStore, () => mainWindow);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: '#090b14',
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
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(devServerUrl);
        }
      }, 1500);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('resize', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const [w, h] = mainWindow.getSize();
    tabManager.setBounds({
      x: 72,
      y: 84,
      width: Math.max(200, w - 72),
      height: Math.max(200, h - 84),
    });
  });

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
      // Clear persistent Chromium session data and cache
      await session.defaultSession.clearStorageData({
        storages: ['cookies', 'localstorage', 'cachestorage', 'serviceworkers', 'indexdb'],
      });
      await session.defaultSession.clearCache();
    } catch (err) {
      console.warn('[Main] Error clearing session storage data:', err);
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
      mainWindow?.webContents.send(IPC_CHANNELS.EVENT_SETTINGS_UPDATED, saved);
      return saved;
    }
  );

  // --- Legacy Compatibility ---
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => currentSettings);
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updated: Partial<AppSettings>) => {
    currentSettings = { ...currentSettings, ...updated };
    return currentSettings;
  });
  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, () => []);
}

app.whenReady().then(() => {
  // Ensure Chromium's default persistent session uses modern desktop Chrome User Agent
  session.defaultSession.setUserAgent(CHROME_DESKTOP_UA);

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
