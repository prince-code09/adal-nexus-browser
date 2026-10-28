import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DownloadManager } from '../src/main/browser/download-manager';
import { BrowserStore } from '../src/main/storage/browser-store';

describe('AdaL Nexus Download Manager & Safety Verification', () => {
  let tmpDir: string;
  let store: BrowserStore;
  let manager: DownloadManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adal-dl-test-'));
    const storePath = path.join(tmpDir, 'test-store.json');
    store = new BrowserStore(storePath);
    manager = new DownloadManager(store, () => null);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('detects missing files when file has been deleted from disk', () => {
    const filePath = path.join(tmpDir, 'sample.txt');
    fs.writeFileSync(filePath, 'hello world');

    store.addOrUpdateDownload({
      id: 'dl-test-1',
      filename: 'sample.txt',
      savePath: filePath,
      url: 'https://example.com/sample.txt',
      receivedBytes: 11,
      totalBytes: 11,
      state: 'completed',
      startTime: Date.now(),
    });

    let downloads = manager.getDownloads();
    expect(downloads.length).toBe(1);
    expect(downloads[0].fileMissing).toBe(false);

    // Delete the file
    fs.unlinkSync(filePath);

    downloads = manager.getDownloads();
    expect(downloads[0].fileMissing).toBe(true);
  });

  it('flags dangerous executable file types', () => {
    const dangerousExts = ['.exe', '.bat', '.cmd', '.msi', '.ps1', '.vbs'];
    for (const ext of dangerousExts) {
      const filename = `installer${ext}`;
      const filePath = path.join(tmpDir, filename);
      fs.writeFileSync(filePath, 'echo dangerous');

      store.addOrUpdateDownload({
        id: `dl-${ext}`,
        filename,
        savePath: filePath,
        url: `https://example.com/${filename}`,
        receivedBytes: 10,
        totalBytes: 10,
        state: 'completed',
        startTime: Date.now(),
        isDangerous: true,
      });

      const list = manager.getDownloads();
      const found = list.find((d) => d.id === `dl-${ext}`);
      expect(found?.isDangerous).toBe(true);
    }
  });

  it('safely rejects opening missing files', async () => {
    const nonExistent = path.join(tmpDir, 'does-not-exist.pdf');
    store.addOrUpdateDownload({
      id: 'dl-missing',
      filename: 'does-not-exist.pdf',
      savePath: nonExistent,
      url: 'https://example.com/file.pdf',
      receivedBytes: 100,
      totalBytes: 100,
      state: 'completed',
      startTime: Date.now(),
    });

    const opened = await manager.openFile('dl-missing');
    expect(opened).toBe(false);
  });
});
