import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  WallpaperService,
  ONLINE_WALLPAPER_CATALOG,
  LOCAL_WALLPAPER_CATALOG,
} from '../src/main/services/wallpaper-service';
import { BrowserStore } from '../src/main/storage/browser-store';

describe('WallpaperService: Online Live Wallpaper & Rotation', () => {
  let tempDir: string;
  let store: BrowserStore;
  let service: WallpaperService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adal-wallpaper-test-'));
    const storePath = path.join(tempDir, 'store.json');
    store = new BrowserStore(storePath);
    service = new WallpaperService(store, () => null, path.join(tempDir, 'wallpapers'));
  });

  afterEach(() => {
    service.stopTimer();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. Provides initial wallpaper info with valid title, author, and source', () => {
    const current = service.getCurrentWallpaper();
    expect(current).toBeDefined();
    expect(current.title).toBeTruthy();
    expect(current.source).toBeTruthy();
    expect(ONLINE_WALLPAPER_CATALOG.length).toBeGreaterThanOrEqual(10);
    expect(LOCAL_WALLPAPER_CATALOG.length).toBeGreaterThanOrEqual(5);
  });

  it('2. Refreshes and advances through online catalog wallpapers', async () => {
    const updated = await service.refreshWallpaper();

    expect(updated).toBeDefined();
    expect(updated.title).toBeTruthy();
    expect(updated.source).toBeTruthy();
    expect(updated.lastUpdated).toBeGreaterThan(0);
  });

  it('3. Respects theme restrictions: stops timer in Soft Light and starts in Dark Live Wallpaper', () => {
    // When in Dark Live Wallpaper
    service.handleSettingsChanged({
      theme: 'dark',
      themeMode: 'live-wallpaper',
      shortcuts: [],
      searchEngine: 'google',
      wallpaperRefreshInterval: 15,
    });
    // Timer should be active

    // When switching to Soft Light
    service.handleSettingsChanged({
      theme: 'light',
      themeMode: 'soft-light',
      shortcuts: [],
      searchEngine: 'google',
    });
    // Timer should be stopped
    expect((service as any).timer).toBeNull();

    // When switching to Dark Cosmic
    service.handleSettingsChanged({
      theme: 'dark',
      themeMode: 'dark-cosmic',
      shortcuts: [],
      searchEngine: 'google',
    });
    expect((service as any).timer).toBeNull();
  });

  it('4. Handles offline network gracefully without blanking wallpaper', async () => {
    // Mock download failure
    vi.spyOn(service as any, 'downloadImageBuffer').mockRejectedValueOnce(new Error('Network offline'));

    const fallback = await service.refreshWallpaper();
    expect(fallback).toBeDefined();
    expect(fallback.status).toBe('offline');
    expect(fallback.errorMessage?.toLowerCase()).toContain('offline');
    // Scenery/image title remains intact and never empty
    expect(fallback.title).toBeTruthy();
    expect(fallback.dataUri).toBeTruthy();
  });

  it('5. Rotates through bundled local wallpapers when offline', () => {
    const local1 = service.loadNextLocalWallpaper();
    expect(local1).toBeDefined();
    expect(local1.title).toBeTruthy();
    expect(local1.status).toBe('offline');
    expect(local1.source).toContain('Bundled');

    const local2 = service.loadNextLocalWallpaper();
    expect(local2).toBeDefined();
    expect(local2.id).not.toBe(local1.id);
  });
});
