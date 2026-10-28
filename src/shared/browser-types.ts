export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isNewTab: boolean;
  error?: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
  folder?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  url: string;
  visitedAt: number;
  favicon?: string;
}

export type DownloadState = 'progressing' | 'completed' | 'cancelled' | 'interrupted';

export interface DownloadItem {
  id: string;
  filename: string;
  savePath: string;
  url: string;
  receivedBytes: number;
  totalBytes: number;
  state: DownloadState;
  startTime: number;
  endTime?: number;
  speed?: number; // bytes per sec
  percent?: number;
}

export interface ShortcutItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  bgColor?: string;
}

export interface BrowserSettings {
  theme: 'dark' | 'light';
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'brave';
  customSearchUrl?: string;
  homeUrl?: string;
  downloadPath?: string;
  shortcuts: ShortcutItem[];
}

export interface BrowserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NavigationError {
  errorCode: number;
  errorDescription: string;
  validatedURL: string;
}
