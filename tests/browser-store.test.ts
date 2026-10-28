import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BrowserStore } from '../src/main/storage/browser-store';

describe('BrowserStore Persistence', () => {
  let tempFilePath: string;
  let store: BrowserStore;

  beforeEach(() => {
    tempFilePath = path.join(os.tmpdir(), `adal-nexus-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.json`);
    store = new BrowserStore(tempFilePath);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch {}
  });

  it('manages bookmarks correctly and persists across store instances', () => {
    // Add bookmark
    const added = store.addBookmark({
      title: 'Ada Lovelace Biography',
      url: 'https://en.wikipedia.org/wiki/Ada_Lovelace',
    });
    expect(added.id).toBeDefined();
    expect(store.isBookmarked('https://en.wikipedia.org/wiki/Ada_Lovelace')).toBe(true);

    // Verify persistence with a new instance reading the same file
    const store2 = new BrowserStore(tempFilePath);
    expect(store2.isBookmarked('https://en.wikipedia.org/wiki/Ada_Lovelace')).toBe(true);
    const bms = store2.getBookmarks();
    expect(bms.some((b) => b.title === 'Ada Lovelace Biography')).toBe(true);

    // Remove bookmark
    store2.removeBookmark(added.id);
    expect(store2.isBookmarked('https://en.wikipedia.org/wiki/Ada_Lovelace')).toBe(false);
  });

  it('records browsing history and prevents duplicate immediate consecutive records', () => {
    store.addHistory({ url: 'https://example.com', title: 'Example Domain' });
    store.addHistory({ url: 'https://example.com', title: 'Example Domain' });
    store.addHistory({ url: 'https://github.com', title: 'GitHub' });

    const history = store.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].url).toBe('https://github.com');
    expect(history[1].url).toBe('https://example.com');

    // Clear history
    store.clearHistory();
    expect(store.getHistory().length).toBe(0);
  });

  it('persists and updates browser settings', () => {
    store.saveSettings({
      theme: 'dark',
      searchEngine: 'duckduckgo',
      homeUrl: 'https://duckduckgo.com',
    });

    const store2 = new BrowserStore(tempFilePath);
    const saved = store2.getSettings();
    expect(saved.searchEngine).toBe('duckduckgo');
    expect(saved.homeUrl).toBe('https://duckduckgo.com');
  });

  it('manages download items and updates status', () => {
    store.addOrUpdateDownload({
      id: 'dl-test-1',
      filename: 'sample.pdf',
      savePath: 'C:\\Users\\test\\Downloads\\sample.pdf',
      url: 'https://example.com/sample.pdf',
      receivedBytes: 500,
      totalBytes: 1000,
      state: 'progressing',
      startTime: Date.now(),
      percent: 50,
    });

    let downloads = store.getDownloads();
    expect(downloads.length).toBe(1);
    expect(downloads[0].percent).toBe(50);

    store.addOrUpdateDownload({
      id: 'dl-test-1',
      filename: 'sample.pdf',
      savePath: 'C:\\Users\\test\\Downloads\\sample.pdf',
      url: 'https://example.com/sample.pdf',
      receivedBytes: 1000,
      totalBytes: 1000,
      state: 'completed',
      startTime: Date.now(),
      percent: 100,
    });

    downloads = store.getDownloads();
    expect(downloads[0].state).toBe('completed');
    expect(downloads[0].percent).toBe(100);
  });
});
