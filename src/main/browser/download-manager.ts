import { BrowserWindow, DownloadItem as ElectronDownloadItem, session, shell } from 'electron';
import * as fs from 'fs';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { DownloadItem } from '../../shared/browser-types';
import { BrowserStore } from '../storage/browser-store';

export class DownloadManager {
  private activeDownloads = new Map<string, ElectronDownloadItem>();
  private store: BrowserStore;
  private getMainWindow: () => BrowserWindow | null;

  constructor(store: BrowserStore, getMainWindow: () => BrowserWindow | null) {
    this.store = store;
    this.getMainWindow = getMainWindow;
    this.setupDownloadHandler();
  }

  private setupDownloadHandler(): void {
    session.defaultSession.on('will-download', (_event, item, webContents) => {
      const id = `dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      this.activeDownloads.set(id, item);

      const filename = item.getFilename();
      const savePath = item.getSavePath();
      const totalBytes = item.getTotalBytes();
      const url = item.getURL();
      const startTime = Date.now();

      let lastBytes = 0;
      let lastTime = startTime;

      const record: DownloadItem = {
        id,
        filename,
        savePath,
        url,
        receivedBytes: 0,
        totalBytes,
        state: 'progressing',
        startTime,
        percent: 0,
        speed: 0,
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
        record.savePath = item.getSavePath() || savePath;
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
        record.savePath = item.getSavePath() || savePath;

        if (state === 'completed') {
          record.state = 'completed';
          record.percent = 100;
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

  async openFile(id: string): Promise<boolean> {
    const list = this.store.getDownloads();
    const item = list.find((d) => d.id === id);
    if (!item || !item.savePath || !fs.existsSync(item.savePath)) {
      return false;
    }
    const err = await shell.openPath(item.savePath);
    return err === '';
  }

  showInFolder(id: string): boolean {
    const list = this.store.getDownloads();
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
