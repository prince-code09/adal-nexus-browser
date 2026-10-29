import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type {
  Bookmark,
  HistoryItem,
  DownloadItem,
  BrowserSettings,
  ShortcutItem,
} from '../../shared/browser-types';

interface StoreData {
  bookmarks: Bookmark[];
  history: HistoryItem[];
  downloads: DownloadItem[];
  settings: BrowserSettings;
}

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  {
    id: 'yt',
    title: 'YouTube',
    url: 'https://www.youtube.com',
    bgColor: '#ef4444',
  },
  {
    id: 'goog',
    title: 'Google',
    url: 'https://www.google.com',
    bgColor: '#3b82f6',
  },
  {
    id: 'gh',
    title: 'GitHub',
    url: 'https://github.com',
    bgColor: '#181717',
  },
  {
    id: 'gpt',
    title: 'ChatGPT',
    url: 'https://chatgpt.com',
    bgColor: '#10a37f',
  },
  {
    id: 'notion',
    title: 'Notion',
    url: 'https://www.notion.so',
    bgColor: '#000000',
  },
];

const DEFAULT_SETTINGS: BrowserSettings = {
  theme: 'dark',
  themeMode: 'dark-cosmic',
  backgroundMode: 'cosmic',
  searchEngine: 'google',
  homeUrl: 'adal://newtab',
  shortcuts: DEFAULT_SHORTCUTS,
};

export class BrowserStore {
  private filePath: string;
  private data: StoreData;

  constructor(customPath?: string) {
    if (customPath) {
      this.filePath = customPath;
    } else {
      const userData = app.getPath('userData');
      this.filePath = path.join(userData, 'adal-nexus-store.json');
    }
    this.data = this.load();
  }

  private load(): StoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        const rawSettings = parsed.settings || {};
        let themeMode = rawSettings.themeMode;
        if (!themeMode) {
          if (rawSettings.backgroundMode === 'live') {
            themeMode = 'live-wallpaper';
          } else if (rawSettings.theme === 'light' || rawSettings.backgroundMode === 'white') {
            themeMode = 'soft-light';
          } else {
            themeMode = 'dark-cosmic';
          }
        }
        const theme = themeMode === 'soft-light' ? 'light' : 'dark';
        const backgroundMode =
          themeMode === 'soft-light' ? 'white' : themeMode === 'live-wallpaper' ? 'live' : 'cosmic';

        return {
          bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
          history: Array.isArray(parsed.history) ? parsed.history : [],
          downloads: Array.isArray(parsed.downloads) ? parsed.downloads : [],
          settings: {
            ...DEFAULT_SETTINGS,
            ...rawSettings,
            themeMode,
            theme,
            backgroundMode,
            shortcuts: Array.isArray(rawSettings.shortcuts) && rawSettings.shortcuts.length > 0
              ? rawSettings.shortcuts
              : DEFAULT_SHORTCUTS,
          },
        };
      }
    } catch (err) {
      console.error('[BrowserStore] Error loading store:', err);
    }

    return {
      bookmarks: [
        {
          id: 'bm-1',
          title: 'Google',
          url: 'https://www.google.com',
          createdAt: Date.now(),
        },
        {
          id: 'bm-2',
          title: 'YouTube',
          url: 'https://www.youtube.com',
          createdAt: Date.now(),
        },
        {
          id: 'bm-3',
          title: 'Example Domain',
          url: 'https://example.com',
          createdAt: Date.now(),
        },
      ],
      history: [],
      downloads: [],
      settings: DEFAULT_SETTINGS,
    };
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[BrowserStore] Error saving store:', err);
    }
  }

  // --- Bookmarks ---
  getBookmarks(): Bookmark[] {
    return [...this.data.bookmarks];
  }

  addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
    const existingIndex = this.data.bookmarks.findIndex((b) => b.url === bookmark.url);
    if (existingIndex >= 0) {
      this.data.bookmarks[existingIndex] = {
        ...this.data.bookmarks[existingIndex],
        ...bookmark,
      };
      this.save();
      return this.data.bookmarks[existingIndex];
    }
    const newBm: Bookmark = {
      ...bookmark,
      id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    this.data.bookmarks.unshift(newBm);
    this.save();
    return newBm;
  }

  removeBookmark(idOrUrl: string): boolean {
    const prevLen = this.data.bookmarks.length;
    this.data.bookmarks = this.data.bookmarks.filter(
      (b) => b.id !== idOrUrl && b.url !== idOrUrl
    );
    if (this.data.bookmarks.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  isBookmarked(url: string): boolean {
    return this.data.bookmarks.some((b) => b.url === url);
  }

  // --- History ---
  getHistory(): HistoryItem[] {
    return [...this.data.history];
  }

  addHistory(entry: { url: string; title: string; favicon?: string }): HistoryItem {
    // Skip empty or internal protocol navigation
    if (!entry.url || entry.url.startsWith('adal://') || entry.url.startsWith('devtools://')) {
      return { id: '', url: entry.url, title: entry.title, visitedAt: Date.now() };
    }

    const item: HistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: entry.url,
      title: entry.title || entry.url,
      visitedAt: Date.now(),
      favicon: entry.favicon,
    };

    // Filter out identical immediate predecessor to keep history clean
    if (this.data.history.length > 0 && this.data.history[0].url === entry.url) {
      this.data.history[0] = item;
    } else {
      this.data.history.unshift(item);
    }

    // Keep max 2000 entries
    if (this.data.history.length > 2000) {
      this.data.history = this.data.history.slice(0, 2000);
    }

    this.save();
    return item;
  }

  removeHistoryItem(id: string): boolean {
    const prev = this.data.history.length;
    this.data.history = this.data.history.filter((h) => h.id !== id);
    if (this.data.history.length !== prev) {
      this.save();
      return true;
    }
    return false;
  }

  clearHistory(): void {
    this.data.history = [];
    this.save();
  }

  // --- Downloads ---
  getDownloads(): DownloadItem[] {
    return [...this.data.downloads];
  }

  addOrUpdateDownload(item: DownloadItem): void {
    const index = this.data.downloads.findIndex((d) => d.id === item.id);
    if (index >= 0) {
      this.data.downloads[index] = { ...this.data.downloads[index], ...item };
    } else {
      this.data.downloads.unshift(item);
    }
    // Keep max 200 downloads
    if (this.data.downloads.length > 200) {
      this.data.downloads = this.data.downloads.slice(0, 200);
    }
    this.save();
  }

  // --- Settings ---
  getSettings(): BrowserSettings {
    return { ...this.data.settings };
  }

  saveSettings(newSettings: Partial<BrowserSettings>): BrowserSettings {
    const updated = { ...newSettings };
    if (updated.themeMode) {
      updated.theme = updated.themeMode === 'soft-light' ? 'light' : 'dark';
      updated.backgroundMode =
        updated.themeMode === 'soft-light' ? 'white' : updated.themeMode === 'live-wallpaper' ? 'live' : 'cosmic';
    } else if (updated.backgroundMode) {
      if (updated.backgroundMode === 'live') {
        updated.themeMode = 'live-wallpaper';
        updated.theme = 'dark';
      } else if (updated.backgroundMode === 'white') {
        updated.themeMode = 'soft-light';
        updated.theme = 'light';
      } else {
        updated.themeMode = 'dark-cosmic';
        updated.theme = 'dark';
      }
    } else if (updated.theme) {
      if (updated.theme === 'light') {
        updated.themeMode = 'soft-light';
        updated.backgroundMode = 'white';
      } else {
        if (this.data.settings.themeMode === 'live-wallpaper') {
          updated.themeMode = 'live-wallpaper';
          updated.backgroundMode = 'live';
        } else {
          updated.themeMode = 'dark-cosmic';
          updated.backgroundMode = 'cosmic';
        }
      }
    }

    this.data.settings = { ...this.data.settings, ...updated };
    this.save();
    return { ...this.data.settings };
  }
}
