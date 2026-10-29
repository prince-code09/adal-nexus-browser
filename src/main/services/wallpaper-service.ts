import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import { app, BrowserWindow } from 'electron';
import type { WallpaperInfo, BrowserSettings } from '../../shared/browser-types';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { BrowserStore } from '../storage/browser-store';

export interface CatalogItem {
  id: string;
  title: string;
  author: string;
  source: string;
  url: string;
}

export interface LocalCatalogItem {
  id: string;
  title: string;
  author: string;
  source: string;
  filename: string;
}

export const ONLINE_WALLPAPER_CATALOG: CatalogItem[] = [
  {
    id: 'cosmic-1',
    title: 'Starry Mountain Peak & Cosmic Nebula',
    author: 'Benjamin Voros',
    source: 'Unsplash (Free License)',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-2',
    title: 'Deep Violet Galaxy & Violet Nebula',
    author: 'Jeremy Thomas',
    source: 'Unsplash (Free License)',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-3',
    title: 'Earth Atmosphere & Starry Space Horizon',
    author: 'NASA Earth Observatory',
    source: 'NASA / Unsplash (Public Domain)',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-4',
    title: 'Cosmic Magenta Galaxy & Celestial Glow',
    author: 'Graham Holtshausen',
    source: 'Unsplash (Free License)',
    url: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-5',
    title: 'Boreal Aurora & Arctic Night Horizon',
    author: 'Jonatan Pie',
    source: 'Unsplash (Free License)',
    url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-6',
    title: 'Starlight Reflections on Alpine Lake',
    author: 'Bailey Zindel',
    source: 'Unsplash (Free License)',
    url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-7',
    title: 'Violet Celestial Horizon & Space Stardust',
    author: 'Billy Huynh',
    source: 'Unsplash (Free License)',
    url: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-8',
    title: 'Interstellar Nebula & Cosmic Dust',
    author: 'NASA / ESA',
    source: 'NASA (Public Domain)',
    url: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-9',
    title: 'Ethereal Night Aurora & Mountain Silhouette',
    author: 'Vincent Guth',
    source: 'Unsplash (Free License)',
    url: 'https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?auto=format&fit=crop&w=1920&q=80',
  },
  {
    id: 'cosmic-10',
    title: 'Infinite Star Field & Starlight Horizon',
    author: 'Lucas Pezeta',
    source: 'Unsplash (Free License)',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
  },
];

export const LOCAL_WALLPAPER_CATALOG: LocalCatalogItem[] = [
  {
    id: 'local-cosmic-1',
    title: 'Cosmic Mountain Ridge & Glowing Planet',
    author: 'AdaL Nexus Studio',
    source: 'Bundled Local Asset',
    filename: 'local-cosmic-1.jpg',
  },
  {
    id: 'local-cosmic-2',
    title: 'Starry Mountain Peak & Cosmic Nebula',
    author: 'Benjamin Voros',
    source: 'Bundled Local Asset (Unsplash Free License)',
    filename: 'local-cosmic-2.jpg',
  },
  {
    id: 'local-cosmic-3',
    title: 'Deep Violet Galaxy & Violet Nebula',
    author: 'Jeremy Thomas',
    source: 'Bundled Local Asset (Unsplash Free License)',
    filename: 'local-cosmic-3.jpg',
  },
  {
    id: 'local-cosmic-4',
    title: 'Earth Atmosphere & Starry Space Horizon',
    author: 'NASA Earth Observatory',
    source: 'Bundled Local Asset (Public Domain)',
    filename: 'local-cosmic-4.jpg',
  },
  {
    id: 'local-cosmic-5',
    title: 'Cosmic Magenta Galaxy & Celestial Glow',
    author: 'Graham Holtshausen',
    source: 'Bundled Local Asset (Unsplash Free License)',
    filename: 'local-cosmic-5.jpg',
  },
];

export class WallpaperService {
  private wallpapersDir: string;
  private currentWallpaper: WallpaperInfo | null = null;
  private timer: NodeJS.Timeout | null = null;
  private onlineIndex = 0;
  private localIndex = 0;
  private isRefreshing = false;
  private consecutiveOfflineFailures = 0;
  private browserStore: BrowserStore;
  private getMainWindow: () => BrowserWindow | null;

  constructor(
    browserStore: BrowserStore,
    getMainWindow: () => BrowserWindow | null,
    customWallpapersDir?: string
  ) {
    this.browserStore = browserStore;
    this.getMainWindow = getMainWindow;

    if (customWallpapersDir) {
      this.wallpapersDir = customWallpapersDir;
    } else {
      const userData = app?.getPath ? app.getPath('userData') : path.join(os.tmpdir(), 'adal-nexus');
      this.wallpapersDir = path.join(userData, 'wallpapers');
    }

    try {
      if (!fs.existsSync(this.wallpapersDir)) {
        fs.mkdirSync(this.wallpapersDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[WallpaperService] Could not create wallpapers dir:', err);
    }

    // Restore cached wallpaper from store, disk, or bundled fallback
    this.initCachedWallpaper();
  }

  public resolveBundledWallpaperPath(filename: string): string | null {
    const candidateDirs = [
      path.join(__dirname, '../../bundled-wallpapers'),
      path.join(process.cwd(), 'bundled-wallpapers'),
      app?.getAppPath ? path.join(app.getAppPath(), 'bundled-wallpapers') : '',
      app?.getAppPath ? path.join(app.getAppPath(), 'dist', 'renderer', 'wallpapers') : '',
      path.join(__dirname, '../renderer/wallpapers'),
      path.join(process.cwd(), 'public', 'wallpapers'),
      path.join(process.cwd(), 'src', 'renderer', 'assets'),
    ].filter(Boolean);

    for (const dir of candidateDirs) {
      const candidate = path.join(dir, filename);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // Fallback: check cosmic-clean-bg.jpg if filename is local-cosmic-1
    for (const dir of candidateDirs) {
      const fallbackClean = path.join(dir, 'cosmic-clean-bg.jpg');
      if (fs.existsSync(fallbackClean)) {
        return fallbackClean;
      }
    }

    return null;
  }

  private initCachedWallpaper(): void {
    const settings = this.browserStore.getSettings();
    const cachedFilePath = path.join(this.wallpapersDir, 'current-wallpaper.jpg');

    if (settings.cachedWallpaper && fs.existsSync(cachedFilePath)) {
      try {
        const buffer = fs.readFileSync(cachedFilePath);
        const dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        this.currentWallpaper = {
          ...settings.cachedWallpaper,
          localPath: cachedFilePath,
          dataUri,
          status: 'active',
        };
        return;
      } catch (err) {
        console.warn('[WallpaperService] Error reading cached wallpaper file:', err);
      }
    }

    // Default initialization from bundled local catalog
    const firstLocal = LOCAL_WALLPAPER_CATALOG[0];
    const resolvedPath = this.resolveBundledWallpaperPath(firstLocal.filename);

    let dataUri: string | undefined;
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      try {
        const buffer = fs.readFileSync(resolvedPath);
        dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        // Seed the cached file so subsequent offline loads find it
        fs.writeFileSync(cachedFilePath, buffer);
      } catch (err) {
        console.warn('[WallpaperService] Error reading initial bundled wallpaper:', err);
      }
    }

    this.currentWallpaper = {
      id: firstLocal.id,
      url: '',
      localPath: resolvedPath || cachedFilePath,
      dataUri,
      title: firstLocal.title,
      author: firstLocal.author,
      source: firstLocal.source,
      status: 'active',
      lastUpdated: Date.now(),
    };
  }

  public getCurrentWallpaper(): WallpaperInfo {
    if (!this.currentWallpaper) {
      this.initCachedWallpaper();
    }
    return this.currentWallpaper!;
  }

  /**
   * Rotates to the next bundled local wallpaper without requiring any network connection.
   */
  public loadNextLocalWallpaper(): WallpaperInfo {
    this.localIndex = (this.localIndex + 1) % LOCAL_WALLPAPER_CATALOG.length;
    const localItem = LOCAL_WALLPAPER_CATALOG[this.localIndex];
    const resolvedPath = this.resolveBundledWallpaperPath(localItem.filename);

    let dataUri = this.currentWallpaper?.dataUri;
    const cachedFilePath = path.join(this.wallpapersDir, 'current-wallpaper.jpg');

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      try {
        const buffer = fs.readFileSync(resolvedPath);
        dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        fs.writeFileSync(cachedFilePath, buffer);
      } catch (err) {
        console.warn('[WallpaperService] Could not read bundled wallpaper:', err);
      }
    }

    const updated: WallpaperInfo = {
      id: localItem.id,
      url: '',
      localPath: resolvedPath || cachedFilePath,
      dataUri,
      title: localItem.title,
      author: localItem.author,
      source: localItem.source,
      status: 'offline',
      lastUpdated: Date.now(),
      errorMessage: 'Offline rotation: using bundled local wallpaper.',
    };

    this.currentWallpaper = updated;
    this.browserStore.saveSettings({ cachedWallpaper: updated });
    this.broadcastWallpaperUpdate(updated);
    return updated;
  }

  /**
   * Refreshes the wallpaper by fetching the next online image from catalog.
   * If network retrieval is unavailable or times out, safely falls back
   * to preserving the current background or rotating to bundled local wallpapers.
   */
  public async refreshWallpaper(): Promise<WallpaperInfo> {
    if (this.isRefreshing) {
      return this.currentWallpaper || this.getCurrentWallpaper();
    }

    this.isRefreshing = true;

    // Advance to next online index
    this.onlineIndex = (this.onlineIndex + 1) % ONLINE_WALLPAPER_CATALOG.length;
    const nextItem = ONLINE_WALLPAPER_CATALOG[this.onlineIndex];

    // Notify UI that a fetch is in progress
    if (this.currentWallpaper) {
      this.currentWallpaper.status = 'loading';
      this.broadcastWallpaperUpdate(this.currentWallpaper);
    }

    try {
      const buffer = await this.downloadImageBuffer(nextItem.url, 8000);
      const cachedFilePath = path.join(this.wallpapersDir, 'current-wallpaper.jpg');
      fs.writeFileSync(cachedFilePath, buffer);

      const dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;

      const updatedInfo: WallpaperInfo = {
        id: nextItem.id,
        url: nextItem.url,
        localPath: cachedFilePath,
        dataUri,
        title: nextItem.title,
        author: nextItem.author,
        source: nextItem.source,
        status: 'active',
        lastUpdated: Date.now(),
      };

      this.consecutiveOfflineFailures = 0;
      this.currentWallpaper = updatedInfo;
      this.browserStore.saveSettings({ cachedWallpaper: updatedInfo });
      this.broadcastWallpaperUpdate(updatedInfo);

      return updatedInfo;
    } catch (err: any) {
      console.warn('[WallpaperService] Online wallpaper fetch failed, falling back:', err.message);
      this.consecutiveOfflineFailures++;

      // If we don't have a working wallpaper yet, rotate to bundled local wallpaper
      if (!this.currentWallpaper?.dataUri) {
        return this.loadNextLocalWallpaper();
      }

      // If multiple consecutive failures have occurred, rotate using bundled local wallpapers
      if (this.consecutiveOfflineFailures > 1) {
        return this.loadNextLocalWallpaper();
      }

      // Preserve existing wallpaper if network request fails (Requirement 6)
      const cachedFilePath = path.join(this.wallpapersDir, 'current-wallpaper.jpg');
      let dataUri = this.currentWallpaper?.dataUri;

      if (!dataUri && fs.existsSync(cachedFilePath)) {
        try {
          const buffer = fs.readFileSync(cachedFilePath);
          dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        } catch {}
      }

      const fallbackInfo: WallpaperInfo = {
        ...this.currentWallpaper,
        dataUri: dataUri || this.currentWallpaper?.dataUri,
        status: 'offline',
        errorMessage: 'Network offline or request timed out. Preserved current background.',
      };

      this.currentWallpaper = fallbackInfo;
      this.broadcastWallpaperUpdate(fallbackInfo);
      return fallbackInfo;
    } finally {
      this.isRefreshing = false;
    }
  }

  private downloadImageBuffer(url: string, timeoutMs: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const req = https.get(
        {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 AdaLNexus/1.0',
            Accept: 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          timeout: timeoutMs,
        },
        (res) => {
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            res.resume();
            return reject(new Error(`HTTP status code ${res.statusCode}`));
          }

          const contentType = res.headers['content-type'] || '';
          if (!contentType.startsWith('image/')) {
            res.resume();
            return reject(new Error(`Invalid content type: ${contentType}`));
          }

          const chunks: Buffer[] = [];
          let totalBytes = 0;
          const maxBytes = 10 * 1024 * 1024; // 10MB limit

          res.on('data', (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes > maxBytes) {
              res.destroy();
              return reject(new Error('Image exceeds 10MB limit'));
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Wallpaper download timed out'));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  private broadcastWallpaperUpdate(info: WallpaperInfo): void {
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.EVENT_WALLPAPER_UPDATED, info);
    }
  }

  public startTimer(intervalMsOrSeconds?: number): void {
    this.stopTimer();

    // Default to ~2.5s (2500ms) automatic rotation as requested
    let intervalMs = 2500;
    if (typeof intervalMsOrSeconds === 'number' && intervalMsOrSeconds > 0) {
      if (intervalMsOrSeconds >= 100) {
        intervalMs = intervalMsOrSeconds;
      } else {
        intervalMs = Math.round(intervalMsOrSeconds * 1000);
      }
    }

    this.timer = setInterval(() => {
      const settings = this.browserStore.getSettings();
      // Strict rule: Only refresh when Dark mode AND live-wallpaper mode is active
      if (settings.themeMode === 'live-wallpaper' && settings.theme === 'dark') {
        if (!this.isRefreshing) {
          this.refreshWallpaper().catch((err) => {
            console.warn('[WallpaperService] Periodic refresh error:', err.message);
          });
        }
      } else {
        this.stopTimer();
      }
    }, intervalMs);

    console.log(`[WallpaperService] Auto-refresh timer started with interval: ${intervalMs}ms`);
  }

  public stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[WallpaperService] Auto-refresh timer stopped');
    }
  }

  public handleSettingsChanged(settings: BrowserSettings): void {
    const isLiveWallpaper =
      settings.themeMode === 'live-wallpaper' && settings.theme === 'dark';

    if (isLiveWallpaper) {
      const interval = settings.wallpaperRefreshInterval || 2.5;
      this.startTimer(interval);

      // If never fetched or cached wallpaper is missing, fetch first one
      if (!this.currentWallpaper?.dataUri) {
        this.refreshWallpaper().catch(() => {});
      }
    } else {
      // Switching away from Live Wallpaper must stop refresh timer and background requests immediately
      this.stopTimer();
    }
  }
}
