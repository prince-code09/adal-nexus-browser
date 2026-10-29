import type {
  AdaLNexusAPI,
  BrowserTab,
  Bookmark,
  HistoryItem,
  DownloadItem,
  BrowserSettings,
  BrowserBounds,
} from '../shared/types';
import { resolveUrlOrSearch } from '../shared/url-resolver';

const STORAGE_KEYS = {
  TABS: 'adal_tabs',
  ACTIVE_TAB_ID: 'adal_active_tab_id',
  BOOKMARKS: 'adal_bookmarks',
  HISTORY: 'adal_history',
  DOWNLOADS: 'adal_downloads',
  SETTINGS: 'adal_settings',
};

const DEFAULT_SETTINGS: BrowserSettings = {
  theme: 'dark',
  searchEngine: 'google',
  homeUrl: 'adal://newtab',
  backgroundMode: 'cosmic',
  shortcuts: [
    { id: 'sc-1', title: 'Google', url: 'https://www.google.com', bgColor: '#4285F4' },
    { id: 'sc-2', title: 'YouTube', url: 'https://www.youtube.com', bgColor: '#FF0000' },
    { id: 'sc-3', title: 'GitHub', url: 'https://github.com', bgColor: '#24292e' },
    { id: 'sc-4', title: 'ChatGPT', url: 'https://chat.openai.com', bgColor: '#10a37f' },
    { id: 'sc-5', title: 'Notion', url: 'https://www.notion.so', bgColor: '#000000' },
  ],
};

function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeSetItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[WebBridge] localStorage set failed for ${key}:`, err);
  }
}

export function initWebBridgeIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (window.adalNexus) {
    console.log('[AdaL Nexus] Native Electron bridge detected.');
    return;
  }

  console.log('[AdaL Nexus] External web environment detected. Initializing Web Adapter bridge.');

  // Initialize initial state
  const initialTabs: BrowserTab[] = safeGetItem<BrowserTab[]>(STORAGE_KEYS.TABS, [
    {
      id: 'tab-web-1',
      title: 'New Tab',
      url: 'adal://newtab',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isNewTab: true,
    },
  ]);

  let activeTabId: string = safeGetItem<string>(
    STORAGE_KEYS.ACTIVE_TAB_ID,
    initialTabs[0]?.id || 'tab-web-1'
  );

  let tabs: BrowserTab[] = initialTabs;
  let bookmarks: Bookmark[] = safeGetItem<Bookmark[]>(STORAGE_KEYS.BOOKMARKS, [
    { id: 'bm-1', title: 'Google', url: 'https://www.google.com', createdAt: Date.now() - 3600000 },
    { id: 'bm-2', title: 'GitHub', url: 'https://github.com', createdAt: Date.now() - 7200000 },
  ]);
  let history: HistoryItem[] = safeGetItem<HistoryItem[]>(STORAGE_KEYS.HISTORY, []);
  let downloads: DownloadItem[] = safeGetItem<DownloadItem[]>(STORAGE_KEYS.DOWNLOADS, []);
  let settings: BrowserSettings = {
    ...DEFAULT_SETTINGS,
    ...safeGetItem<Partial<BrowserSettings>>(STORAGE_KEYS.SETTINGS, {}),
  };

  // Pub/Sub listeners
  const tabsListeners = new Set<(tabs: BrowserTab[]) => void>();
  const activeTabListeners = new Set<(tab: BrowserTab | null) => void>();
  const bookmarkListeners = new Set<(bms: Bookmark[]) => void>();
  const historyListeners = new Set<(hist: HistoryItem[]) => void>();
  const downloadListeners = new Set<(dl: DownloadItem) => void>();
  const settingsListeners = new Set<(settings: BrowserSettings) => void>();

  const getActiveTab = (): BrowserTab | null => {
    return tabs.find((t) => t.id === activeTabId) || (tabs.length > 0 ? tabs[0] : null);
  };

  const notifyTabs = () => {
    safeSetItem(STORAGE_KEYS.TABS, tabs);
    const copy = tabs.map((t) => ({ ...t }));
    tabsListeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const notifyActiveTab = () => {
    safeSetItem(STORAGE_KEYS.ACTIVE_TAB_ID, activeTabId);
    const active = getActiveTab();
    activeTabListeners.forEach((fn) => {
      try {
        fn(active ? { ...active } : null);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const notifyBookmarks = () => {
    safeSetItem(STORAGE_KEYS.BOOKMARKS, bookmarks);
    const copy = [...bookmarks];
    bookmarkListeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const notifyHistory = () => {
    safeSetItem(STORAGE_KEYS.HISTORY, history);
    const copy = [...history];
    historyListeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const notifySettings = () => {
    safeSetItem(STORAGE_KEYS.SETTINGS, settings);
    const copy = { ...settings };
    settingsListeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const mockApi: AdaLNexusAPI = {
    // Window controls
    minimize: () => console.log('[WebBridge] minimize called'),
    maximize: () => console.log('[WebBridge] maximize called'),
    close: () => console.log('[WebBridge] close called'),
    isMaximized: async () => false,

    // Tabs
    createTab: async (url?: string): Promise<BrowserTab> => {
      const id = `tab-web-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const isNewTab = !url || url === 'adal://newtab';
      const effectiveUrl = isNewTab ? 'adal://newtab' : resolveUrlOrSearch(url, settings.searchEngine);

      let title = 'New Tab';
      if (!isNewTab) {
        if (effectiveUrl.includes('google.com/search')) {
          const match = effectiveUrl.match(/[?&]q=([^&]+)/);
          const q = match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : 'Google Search';
          title = `${q} - Google Search`;
        } else {
          try {
            const parsed = new URL(effectiveUrl);
            title = parsed.hostname;
          } catch {
            title = effectiveUrl;
          }
        }
      }

      const newTab: BrowserTab = {
        id,
        title,
        url: effectiveUrl,
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        isNewTab,
      };

      tabs = [...tabs, newTab];
      activeTabId = id;

      notifyTabs();
      notifyActiveTab();

      if (!isNewTab) {
        mockApi.navigate(id, effectiveUrl);
      }

      return { ...newTab };
    },

    switchTab: async (tabId: string): Promise<boolean> => {
      const found = tabs.find((t) => t.id === tabId);
      if (!found) return false;
      activeTabId = tabId;
      notifyTabs();
      notifyActiveTab();
      return true;
    },

    closeTab: async (tabId: string): Promise<boolean> => {
      const index = tabs.findIndex((t) => t.id === tabId);
      if (index === -1) return false;

      tabs = tabs.filter((t) => t.id !== tabId);

      if (tabs.length === 0) {
        const freshTab: BrowserTab = {
          id: `tab-web-${Date.now()}`,
          title: 'New Tab',
          url: 'adal://newtab',
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          isNewTab: true,
        };
        tabs = [freshTab];
        activeTabId = freshTab.id;
      } else if (activeTabId === tabId) {
        const nextIndex = Math.max(0, index - 1);
        activeTabId = tabs[nextIndex].id;
      }

      notifyTabs();
      notifyActiveTab();
      return true;
    },

    getTabs: async (): Promise<BrowserTab[]> => {
      return tabs.map((t) => ({ ...t }));
    },

    getActiveTab: async (): Promise<BrowserTab | null> => {
      const active = getActiveTab();
      return active ? { ...active } : null;
    },

    setBounds: async (_bounds: BrowserBounds): Promise<void> => {
      // In web fallback, layout is managed by React CSS
    },

    setViewVisible: async (_visible: boolean): Promise<boolean> => {
      return true;
    },

    // Navigation
    navigate: async (tabId: string, urlOrQuery: string): Promise<boolean> => {
      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return false;

      const trimmed = urlOrQuery.trim();
      if (!trimmed) return false;

      const resolved = resolveUrlOrSearch(trimmed, settings.searchEngine);
      const isNewTab = resolved === 'adal://newtab';

      let title = 'New Tab';
      if (!isNewTab) {
        if (resolved.includes('google.com/search')) {
          const match = resolved.match(/[?&]q=([^&]+)/);
          const q = match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : 'Google Search';
          title = `${q} - Google Search`;
        } else {
          try {
            const parsed = new URL(resolved);
            title = parsed.hostname;
          } catch {
            title = resolved;
          }
        }
      }

      tabs[tabIndex] = {
        ...tabs[tabIndex],
        url: resolved,
        title,
        isNewTab,
        isLoading: false,
        canGoBack: true,
      };

      activeTabId = tabId;

      if (!isNewTab) {
        // Record in history
        const historyItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          title,
          url: resolved,
          visitedAt: Date.now(),
        };
        history = [historyItem, ...history.filter((h) => h.url !== resolved)].slice(0, 500);
        notifyHistory();
      }

      notifyTabs();
      notifyActiveTab();
      return true;
    },

    goBack: async (tabId: string): Promise<boolean> => {
      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return false;
      tabs[tabIndex] = {
        ...tabs[tabIndex],
        url: 'adal://newtab',
        title: 'New Tab',
        isNewTab: true,
        canGoBack: false,
        canGoForward: true,
      };
      notifyTabs();
      notifyActiveTab();
      return true;
    },

    goForward: async (_tabId: string): Promise<boolean> => {
      return false;
    },

    reload: async (tabId: string): Promise<boolean> => {
      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return false;
      tabs[tabIndex] = { ...tabs[tabIndex], isLoading: true };
      notifyTabs();
      notifyActiveTab();
      setTimeout(() => {
        if (tabs[tabIndex]) {
          tabs[tabIndex] = { ...tabs[tabIndex], isLoading: false };
          notifyTabs();
          notifyActiveTab();
        }
      }, 500);
      return true;
    },

    stop: async (tabId: string): Promise<boolean> => {
      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return false;
      tabs[tabIndex] = { ...tabs[tabIndex], isLoading: false };
      notifyTabs();
      notifyActiveTab();
      return true;
    },

    goHome: async (_tabId: string): Promise<boolean> => {
      const existingNewTab = tabs.find((t) => t.isNewTab || t.url === 'adal://newtab');
      if (existingNewTab) {
        return mockApi.switchTab(existingNewTab.id);
      }
      const newTab = await mockApi.createTab('adal://newtab');
      return Boolean(newTab);
    },

    // Bookmarks
    getBookmarks: async (): Promise<Bookmark[]> => {
      return [...bookmarks];
    },

    addBookmark: async (bm: { title: string; url: string; favicon?: string }): Promise<Bookmark> => {
      const newBm: Bookmark = {
        id: `bm-${Date.now()}`,
        title: bm.title,
        url: bm.url,
        favicon: bm.favicon,
        createdAt: Date.now(),
      };
      bookmarks = [newBm, ...bookmarks];
      notifyBookmarks();
      return newBm;
    },

    removeBookmark: async (idOrUrl: string): Promise<boolean> => {
      const initialLen = bookmarks.length;
      bookmarks = bookmarks.filter((b) => b.id !== idOrUrl && b.url !== idOrUrl);
      if (bookmarks.length !== initialLen) {
        notifyBookmarks();
        return true;
      }
      return false;
    },

    isBookmarked: async (url: string): Promise<boolean> => {
      return bookmarks.some((b) => b.url === url);
    },

    // History
    getHistory: async (): Promise<HistoryItem[]> => {
      return [...history];
    },

    clearHistory: async (): Promise<void> => {
      history = [];
      notifyHistory();
    },

    removeHistoryItem: async (id: string): Promise<boolean> => {
      const initialLen = history.length;
      history = history.filter((h) => h.id !== id);
      if (history.length !== initialLen) {
        notifyHistory();
        return true;
      }
      return false;
    },

    // Downloads
    getDownloads: async (): Promise<DownloadItem[]> => {
      return [...downloads];
    },

    openDownloadFile: async (_id: string): Promise<boolean> => false,
    showDownloadInFolder: async (_id: string): Promise<boolean> => false,
    cancelDownload: async (id: string): Promise<boolean> => {
      downloads = downloads.filter((d) => d.id !== id);
      return true;
    },

    // Settings
    getBrowserSettings: async (): Promise<BrowserSettings> => {
      return { ...settings };
    },

    saveBrowserSettings: async (newSettings: Partial<BrowserSettings>): Promise<BrowserSettings> => {
      settings = {
        ...settings,
        ...newSettings,
      };
      notifySettings();
      return { ...settings };
    },

    // Live Wallpaper
    getLiveWallpaper: async () => ({
      id: 'cosmic-1',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
      title: 'Starry Mountain Peak & Cosmic Nebula',
      author: 'Benjamin Voros',
      source: 'Unsplash (Free License)',
      status: 'active',
      lastUpdated: Date.now(),
    }),

    refreshLiveWallpaper: async () => ({
      id: 'cosmic-2',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
      title: 'Deep Violet Galaxy & Violet Nebula',
      author: 'Jeremy Thomas',
      source: 'Unsplash (Free License)',
      status: 'active',
      lastUpdated: Date.now(),
    }),

    getSystemTelemetry: async () => ({
      heapUsedMB: 120,
      heapTotalMB: 280,
      rssMB: 190,
      privateBytesMB: 160,
      gpuRenderer: 'Web Rendering Context',
      gpuStatus: 'Active',
      cpuPercent: 2.1,
      nodeVersion: '20.0.0',
      electronVersion: '45.1.0',
      chromeVersion: '133.0.0',
      sandboxVerified: true,
      contextIsolationVerified: true,
    }),

    optimizeMemory: async () => ({
      success: true,
      freedMB: 40,
    }),

    clearCacheAndHistory: async () => {
      const recordsRemoved = history.length;
      history = [];
      notifyHistory();
      return {
        success: true,
        recordsRemoved,
        cacheCleared: true,
      };
    },

    getExtensions: async () => [
      {
        id: 'ext-adal-companion',
        name: 'AdaL AI Companion Assistant',
        version: '1.0.0',
        enabled: true,
        description: 'Autonomous research and verified page understanding assistant',
      },
    ],

    getAllArtifacts: async () => [],
    deleteArtifact: async () => true,
    openArtifact: async () => true,

    // Event Subscriptions
    onTabsUpdated: (callback: (tabs: BrowserTab[]) => void) => {
      tabsListeners.add(callback);
      return () => {
        tabsListeners.delete(callback);
      };
    },

    onActiveTabChanged: (callback: (tab: BrowserTab | null) => void) => {
      activeTabListeners.add(callback);
      return () => {
        activeTabListeners.delete(callback);
      };
    },

    onDownloadUpdated: (callback: (download: DownloadItem) => void) => {
      downloadListeners.add(callback);
      return () => {
        downloadListeners.delete(callback);
      };
    },

    onHistoryUpdated: (callback: (hist: HistoryItem[]) => void) => {
      historyListeners.add(callback);
      return () => {
        historyListeners.delete(callback);
      };
    },

    onBookmarksUpdated: (callback: (bms: Bookmark[]) => void) => {
      bookmarkListeners.add(callback);
      return () => {
        bookmarkListeners.delete(callback);
      };
    },

    onSettingsUpdated: (callback: (s: BrowserSettings) => void) => {
      settingsListeners.add(callback);
      return () => {
        settingsListeners.delete(callback);
      };
    },

    onLiveWallpaperUpdated: (_callback: (info: any) => void) => () => {},

    onFocusUrlInput: (_callback: () => void) => () => {},
    onShortcutBookmark: (_callback: (url: string) => void) => () => {},
  };

  window.adalNexus = mockApi;
}
