import { app, BrowserWindow, DownloadItem as ElectronDownloadItem, session, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { DownloadItem } from '../../shared/browser-types';
import { BrowserStore } from '../storage/browser-store';

const DANGEROUS_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.msi',
  '.ps1',
  '.vbs',
  '.scr',
  '.jar',
  '.reg',
  '.com',
  '.pif',
]);

export class DownloadManager {
  private activeDownloads = new Map<string, ElectronDownloadItem>();
  private store: BrowserStore;
  private getMainWindow: () => BrowserWindow | null;

  constructor(store: BrowserStore, getMainWindow: () => BrowserWindow | null) {
    this.store = store;
    this.getMainWindow = getMainWindow;
    this.setupDownloadHandler();
  }

  private getManagedDirectory(): string {
    const userDataPath = app?.getPath ? app.getPath('userData') : path.resolve(process.cwd(), '.adal-nexus');
    const dir = path.join(userDataPath, 'ManagedFiles');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn('[DownloadManager] Failed to create ManagedFiles directory:', err);
      }
    }
    return dir;
  }

  private resolveUniqueFilePath(targetDir: string, rawFilename: string): string {
    // Sanitize against path traversal: take only the file basename
    const cleanBasename = path.basename(rawFilename).replace(/[<>:"/\\|?*]/g, '_') || 'download';
    const ext = path.extname(cleanBasename);
    const nameWithoutExt = path.basename(cleanBasename, ext);

    let candidate = path.join(targetDir, cleanBasename);
    let counter = 1;

    // Resolve duplicates safely without silently overwriting existing files
    while (fs.existsSync(candidate)) {
      candidate = path.join(targetDir, `${nameWithoutExt} (${counter})${ext}`);
      counter++;
    }

    return candidate;
  }

  private setupDownloadHandler(): void {
    if (!session || !session.defaultSession) {
      return;
    }
    session.defaultSession.on('will-download', (_event, item) => {
      const id = `dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      this.activeDownloads.set(id, item);

      const defaultDlPath = app?.getPath ? app.getPath('downloads') : path.resolve(process.cwd(), 'downloads');
      const settings = this.store.getSettings();
      const targetDir =
        settings.downloadLocationMode === 'managed'
          ? this.getManagedDirectory()
          : settings.downloadPath && fs.existsSync(settings.downloadPath)
          ? settings.downloadPath
          : defaultDlPath;

      const rawFilename = item.getFilename();
      const finalSavePath = this.resolveUniqueFilePath(targetDir, rawFilename);
      item.setSavePath(finalSavePath);

      const ext = path.extname(finalSavePath).toLowerCase();
      const isDangerous = DANGEROUS_EXTENSIONS.has(ext);

      const filename = path.basename(finalSavePath);
      const totalBytes = item.getTotalBytes();
      const url = item.getURL();
      const startTime = Date.now();

      let lastBytes = 0;
      let lastTime = startTime;

      const record: DownloadItem = {
        id,
        filename,
        savePath: finalSavePath,
        url,
        receivedBytes: 0,
        totalBytes,
        state: 'progressing',
        startTime,
        percent: 0,
        speed: 0,
        isDangerous,
        fileMissing: false,
      };

      this.store.addOrUpdateDownload(record);
      this.broadcastUpdate(record);

      item.on('updated', (_evt, state) => {
        const now = Date.now();
        const receivedBytes = item.getReceivedBytes();
        const timeDiff = (now - lastTime) / 1000;
        let speed = 0;

        if (timeDiff > 0.5) {
          speed = Math.round((receivedBytes - lastBytes) / timeDiff);
          lastBytes = receivedBytes;
          lastTime = now;
        }

        const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;

        record.receivedBytes = receivedBytes;
        record.savePath = item.getSavePath() || finalSavePath;
        record.percent = percent;
        record.speed = speed;
        record.state = state === 'interrupted' ? 'interrupted' : 'progressing';

        this.store.addOrUpdateDownload(record);
        this.broadcastUpdate(record);
      });

      item.once('done', (_evt, state) => {
        this.activeDownloads.delete(id);
        record.endTime = Date.now();
        record.receivedBytes = item.getReceivedBytes();
        record.savePath = item.getSavePath() || finalSavePath;

        if (state === 'completed') {
          record.state = 'completed';
          record.percent = 100;
          record.fileMissing = !fs.existsSync(record.savePath);
        } else if (state === 'cancelled') {
          record.state = 'cancelled';
        } else {
          record.state = 'interrupted';
        }

        this.store.addOrUpdateDownload(record);
        this.broadcastUpdate(record);
      });
    });
  }

  private broadcastUpdate(item: DownloadItem): void {
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.EVENT_DOWNLOAD_UPDATED, item);
    }
  }

  getDownloads(): DownloadItem[] {
    const list = this.store.getDownloads();
    // Validate file existence on disk
    return list.map((item) => ({
      ...item,
      fileMissing: Boolean(item.savePath && !fs.existsSync(item.savePath)),
    }));
  }

  async openFile(id: string): Promise<boolean> {
    const list = this.getDownloads();
    const item = list.find((d) => d.id === id);
    if (!item || !item.savePath || !fs.existsSync(item.savePath)) {
      return false;
    }
    // Safe opening through system default application without automatic shell execution
    const err = await shell.openPath(item.savePath);
    return err === '';
  }

  showInFolder(id: string): boolean {
    const list = this.getDownloads();
    const item = list.find((d) => d.id === id);
    if (!item || !item.savePath || !fs.existsSync(item.savePath)) {
      return false;
    }
    shell.showItemInFolder(item.savePath);
    return true;
  }

  cancelDownload(id: string): boolean {
    const item = this.activeDownloads.get(id);
    if (item) {
      item.cancel();
      this.activeDownloads.delete(id);
      return true;
    }
    return false;
  }
}
