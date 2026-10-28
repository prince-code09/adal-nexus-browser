import { BrowserWindow, WebContentsView } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { BrowserTab, BrowserBounds } from '../../shared/browser-types';
import { BrowserStore } from '../storage/browser-store';
import { resolveUrlOrSearch } from './url-resolver';

interface TabInstance {
  id: string;
  view: WebContentsView;
  info: BrowserTab;
}

export class TabManager {
  private tabs: TabInstance[] = [];
  private activeTabId: string = '';
  private bounds: BrowserBounds = { x: 72, y: 84, width: 1200, height: 700 };
  private store: BrowserStore;
  private getMainWindow: () => BrowserWindow | null;

  constructor(store: BrowserStore, getMainWindow: () => BrowserWindow | null) {
    this.store = store;
    this.getMainWindow = getMainWindow;
  }

  getTabs(): BrowserTab[] {
    return this.tabs.map((t) => ({ ...t.info }));
  }

  getActiveTabId(): string {
    return this.activeTabId;
  }

  getActiveTab(): BrowserTab | null {
    const tab = this.tabs.find((t) => t.id === this.activeTabId);
    return tab ? { ...tab.info } : null;
  }

  setBounds(bounds: BrowserBounds): void {
    if (bounds.width <= 0 || bounds.height <= 0) return;
    this.bounds = bounds;

    const activeTab = this.tabs.find((t) => t.id === this.activeTabId);
    if (activeTab && !activeTab.info.isNewTab) {
      try {
        activeTab.view.setBounds({
          x: Math.round(this.bounds.x),
          y: Math.round(this.bounds.y),
          width: Math.round(this.bounds.width),
          height: Math.round(this.bounds.height),
        });
      } catch (err) {
        console.warn('[TabManager] Failed to set bounds:', err);
      }
    }
  }

  createTab(initialUrl?: string, activate: boolean = true): BrowserTab {
    const id = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const isNewTab = !initialUrl || initialUrl === 'adal://newtab';
    const effectiveUrl = isNewTab ? 'adal://newtab' : initialUrl;

    const win = this.getMainWindow();

    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    });

    const info: BrowserTab = {
      id,
      title: isNewTab ? 'New Tab' : 'Loading...',
      url: effectiveUrl,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isNewTab,
    };

    const tabInstance: TabInstance = { id, view, info };
    this.tabs.push(tabInstance);

    // Attach to mainWindow contentView
    if (win && !win.isDestroyed()) {
      win.contentView.addChildView(view);
      view.setVisible(false);
    }

    this.setupViewEvents(tabInstance);

    if (activate) {
      this.switchTab(id);
    } else {
      this.broadcastTabs();
    }

    if (!isNewTab && effectiveUrl) {
      this.navigate(id, effectiveUrl);
    }

    return { ...info };
  }

  switchTab(tabId: string): boolean {
    const target = this.tabs.find((t) => t.id === tabId);
    if (!target) return false;

    const prevActive = this.tabs.find((t) => t.id === this.activeTabId);
    if (prevActive && prevActive.id !== tabId) {
      prevActive.view.setVisible(false);
    }

    this.activeTabId = tabId;
    const win = this.getMainWindow();

    if (target.info.isNewTab) {
      target.view.setVisible(false);
    } else {
      if (win && !win.isDestroyed()) {
        win.contentView.addChildView(target.view);
      }
      target.view.setBounds({
        x: Math.round(this.bounds.x),
        y: Math.round(this.bounds.y),
        width: Math.round(this.bounds.width),
        height: Math.round(this.bounds.height),
      });
      target.view.setVisible(true);
    }

    this.broadcastTabs();
    this.broadcastActiveTab();
    return true;
  }

  closeTab(tabId: string): boolean {
    const index = this.tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return false;

    const [removed] = this.tabs.splice(index, 1);
    const win = this.getMainWindow();

    try {
      if (win && !win.isDestroyed()) {
        win.contentView.removeChildView(removed.view);
      }
      (removed.view.webContents as any).close();
    } catch (err) {
      console.warn('[TabManager] Error destroying view:', err);
    }

    if (this.tabs.length === 0) {
      // If user closed the last tab, create a fresh New Tab
      this.createTab('adal://newtab', true);
    } else if (this.activeTabId === tabId) {
      // Switch to previous or first remaining tab
      const newIndex = Math.max(0, index - 1);
      this.switchTab(this.tabs[newIndex].id);
    } else {
      this.broadcastTabs();
    }

    return true;
  }

  navigate(tabId: string, urlOrQuery: string): boolean {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return false;

    const settings = this.store.getSettings();
    const resolved = resolveUrlOrSearch(urlOrQuery, settings.searchEngine);

    if (resolved === 'adal://newtab') {
      tab.info.isNewTab = true;
      tab.info.url = 'adal://newtab';
      tab.info.title = 'New Tab';
      tab.info.favicon = undefined;
      tab.info.canGoBack = false;
      tab.info.canGoForward = false;
      tab.view.setVisible(false);
      this.broadcastTabs();
      this.broadcastActiveTab();
      return true;
    }

    tab.info.isNewTab = false;
    tab.info.url = resolved;
    tab.info.title = resolved;
    tab.info.isLoading = true;

    if (this.activeTabId === tabId) {
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.contentView.addChildView(tab.view);
      }
      tab.view.setBounds({
        x: Math.round(this.bounds.x),
        y: Math.round(this.bounds.y),
        width: Math.round(this.bounds.width),
        height: Math.round(this.bounds.height),
      });
      tab.view.setVisible(true);
    }

    // Record in history
    if (!tab.info.isNewTab && !resolved.startsWith('data:text/html')) {
      this.store.addHistory({
        url: resolved,
        title: tab.info.title || resolved,
        favicon: tab.info.favicon,
      });
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_HISTORY_UPDATED, this.store.getHistory());
      }
    }

    tab.view.webContents.loadURL(resolved).catch((err) => {
      console.warn('[TabManager] Navigation error:', err);
    });

    this.broadcastTabs();
    this.broadcastActiveTab();
    return true;
  }

  goBack(tabId: string): boolean {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab && tab.view.webContents.canGoBack()) {
      tab.view.webContents.goBack();
      return true;
    }
    return false;
  }

  goForward(tabId: string): boolean {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab && tab.view.webContents.canGoForward()) {
      tab.view.webContents.goForward();
      return true;
    }
    return false;
  }

  reload(tabId: string): boolean {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab && !tab.info.isNewTab) {
      tab.view.webContents.reload();
      return true;
    }
    return false;
  }

  stop(tabId: string): boolean {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (tab && !tab.info.isNewTab) {
      tab.view.webContents.stop();
      return true;
    }
    return false;
  }

  goHome(tabId: string): boolean {
    const settings = this.store.getSettings();
    return this.navigate(tabId, settings.homeUrl || 'adal://newtab');
  }

  private setupViewEvents(tab: TabInstance): void {
    const wc = tab.view.webContents;

    wc.setWindowOpenHandler(({ url }) => {
      // Safe policy: open popup links as a new managed tab inside AdaL Nexus!
      this.createTab(url, true);
      return { action: 'deny' };
    });

    wc.on('did-start-loading', () => {
      tab.info.isLoading = true;
      this.broadcastTabs();
      if (this.activeTabId === tab.id) {
        this.broadcastActiveTab();
      }
    });

    wc.on('did-stop-loading', () => {
      tab.info.isLoading = false;
      tab.info.canGoBack = wc.canGoBack();
      tab.info.canGoForward = wc.canGoForward();
      this.broadcastTabs();
      if (this.activeTabId === tab.id) {
        this.broadcastActiveTab();
      }
    });

    wc.on('page-title-updated', (_event, title) => {
      tab.info.title = title || tab.info.url;
      this.broadcastTabs();
      if (this.activeTabId === tab.id) {
        this.broadcastActiveTab();
      }
    });

    wc.on('page-favicon-updated', (_event, favicons) => {
      if (favicons && favicons.length > 0) {
        tab.info.favicon = favicons[0];
        this.broadcastTabs();
        if (this.activeTabId === tab.id) {
          this.broadcastActiveTab();
        }
      }
    });

    wc.on('did-navigate', (_event, url) => {
      tab.info.url = url;
      tab.info.isNewTab = url === 'adal://newtab';
      tab.info.canGoBack = wc.canGoBack();
      tab.info.canGoForward = wc.canGoForward();

      if (!tab.info.isNewTab && !url.startsWith('data:text/html')) {
        this.store.addHistory({
          url,
          title: tab.info.title || url,
          favicon: tab.info.favicon,
        });
        const win = this.getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.EVENT_HISTORY_UPDATED, this.store.getHistory());
        }
      }

      this.broadcastTabs();
      if (this.activeTabId === tab.id) {
        this.broadcastActiveTab();
      }
    });

    wc.on('did-navigate-in-page', (_event, url) => {
      tab.info.url = url;
      tab.info.canGoBack = wc.canGoBack();
      tab.info.canGoForward = wc.canGoForward();
      this.broadcastTabs();
      if (this.activeTabId === tab.id) {
        this.broadcastActiveTab();
      }
    });

    wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      // errorCode -3 is ABORTED (e.g. redirected or stopped), ignore it
      if (errorCode === -3) return;

      tab.info.isLoading = false;
      tab.info.error = `${errorDescription} (${errorCode})`;

      // Render a polished AdaL Nexus error page inside the tab
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #0b0f19;
              color: #f1f5f9;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
              box-sizing: border-box;
            }
            .card {
              background: rgba(18, 24, 38, 0.85);
              border: 1px solid rgba(139, 92, 246, 0.3);
              border-radius: 16px;
              padding: 40px;
              max-width: 520px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(124, 58, 237, 0.15);
            }
            .badge {
              display: inline-flex;
              align-items: center;
              padding: 6px 12px;
              background: rgba(239, 68, 68, 0.15);
              color: #f87171;
              border: 1px solid rgba(239, 68, 68, 0.3);
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 20px;
            }
            h1 {
              font-size: 24px;
              margin: 0 0 12px;
              font-weight: 700;
              color: #ffffff;
            }
            p {
              color: #94a3b8;
              font-size: 14px;
              line-height: 1.6;
              margin: 0 0 24px;
              word-break: break-all;
            }
            .btn {
              display: inline-block;
              background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
              color: #ffffff;
              padding: 10px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              font-size: 14px;
              cursor: pointer;
              border: none;
              transition: all 0.2s ease;
            }
            .btn:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Unable to Load Page</div>
            <h1>This site can't be reached</h1>
            <p>${validatedURL}</p>
            <p style="font-size: 12px; color: #64748b;">${errorDescription} (Code: ${errorCode})</p>
            <button class="btn" onclick="location.reload()">Try Again</button>
          </div>
        </body>
        </html>
      `;

      wc.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`).catch(() => {});
      this.broadcastTabs();
      if (this.activeTabId === tab.id) {
        this.broadcastActiveTab();
      }
    });
  }

  private broadcastTabs(): void {
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.EVENT_TABS_UPDATED, this.getTabs());
    }
  }

  private broadcastActiveTab(): void {
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.EVENT_ACTIVE_TAB_CHANGED, this.getActiveTab());
    }
  }
}
