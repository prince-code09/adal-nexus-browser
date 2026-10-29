import { BrowserWindow, WebContentsView, Menu, MenuItem, clipboard } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { BrowserTab, BrowserBounds } from '../../shared/browser-types';
import { BrowserStore } from '../storage/browser-store';
import { resolveUrlOrSearch } from './url-resolver';

interface TabInstance {
  id: string;
  view: WebContentsView;
  info: BrowserTab;
}

export const HEADER_HEIGHT = 84;
export const SIDEBAR_WIDTH = 72;
export const ADAL_SESSION_PARTITION = 'persist:adal-profile';

export class TabManager {
  private tabs: TabInstance[] = [];
  private activeTabId: string = '';
  private bounds: BrowserBounds = { x: SIDEBAR_WIDTH, y: HEADER_HEIGHT, width: 1200, height: 700 };
  private isViewSuspended: boolean = false;
  private closedTabsHistory: { url: string; title: string }[] = [];
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

  setBounds(bounds: Partial<BrowserBounds>): void {
    const win = this.getMainWindow();
    const cvBounds =
      win && !win.isDestroyed()
        ? win.contentView.getBounds()
        : { width: 1440, height: 900 };

    // Strict clamping: Website WebContentsView can NEVER cover the top header (84px) or left sidebar (72px)
    const x = Math.max(SIDEBAR_WIDTH, Math.round(bounds.x ?? this.bounds.x ?? SIDEBAR_WIDTH));
    const y = Math.max(HEADER_HEIGHT, Math.round(bounds.y ?? this.bounds.y ?? HEADER_HEIGHT));

    const maxWidth = Math.max(200, cvBounds.width - x);
    const maxHeight = Math.max(200, cvBounds.height - y);

    let width =
      bounds.width !== undefined && bounds.width > 0
        ? Math.round(bounds.width)
        : maxWidth;
    let height =
      bounds.height !== undefined && bounds.height > 0
        ? Math.round(bounds.height)
        : maxHeight;

    // Ensure view bounds strictly stay within window contentView
    width = Math.min(width, maxWidth);
    height = Math.min(height, maxHeight);

    this.bounds = { x, y, width, height };
    this.updateViewAttachment();
  }

  setViewVisible(visible: boolean): boolean {
    this.isViewSuspended = !visible;
    this.updateViewAttachment();
    return true;
  }

  isViewSuspendedState(): boolean {
    return this.isViewSuspended;
  }

  createTab(initialUrl?: string, activate: boolean = true): BrowserTab {
    const id = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const isNewTab = !initialUrl || initialUrl === 'adal://newtab';
    const effectiveUrl = isNewTab ? 'adal://newtab' : initialUrl;

    let view: any;
    if (typeof WebContentsView === 'function') {
      view = new WebContentsView({
        webPreferences: {
          partition: ADAL_SESSION_PARTITION,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
          plugins: true,
        },
      });
      view.setBackgroundColor('#ffffff');
    } else {
      // Test environment fallback mock
      view = {
        setBackgroundColor: () => {},
        setBounds: () => {},
        setVisible: () => {},
        webContents: {
          loadURL: async () => {},
          reload: () => {},
          stop: () => {},
          canGoBack: () => false,
          canGoForward: () => false,
          close: () => {},
          setWindowOpenHandler: () => {},
          on: () => {},
        },
      };
    }

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

    this.activeTabId = tabId;
    this.updateViewAttachment(tabId);

    this.broadcastTabs();
    this.broadcastActiveTab();
    return true;
  }

  closeTab(tabId: string): boolean {
    const index = this.tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return false;

    const [removed] = this.tabs.splice(index, 1);
    const win = this.getMainWindow();

    if (
      removed &&
      removed.info &&
      !removed.info.isNewTab &&
      removed.info.url &&
      removed.info.url !== 'adal://newtab'
    ) {
      this.closedTabsHistory.push({ url: removed.info.url, title: removed.info.title });
      if (this.closedTabsHistory.length > 20) {
        this.closedTabsHistory.shift();
      }
    }

    try {
      if (win && !win.isDestroyed() && win.contentView.children.includes(removed.view)) {
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
      this.updateViewAttachment();
      this.broadcastTabs();
    }

    return true;
  }

  reopenLastClosedTab(): BrowserTab | null {
    const last = this.closedTabsHistory.pop();
    if (last && last.url) {
      return this.createTab(last.url, true);
    }
    return null;
  }

  navigate(tabId: string, urlOrQuery: string): boolean {
    console.log('[TabManager.navigate] called with:', { tabId, urlOrQuery, allTabIds: this.tabs.map((t) => t.id) });
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) {
      console.warn('[TabManager.navigate] tab NOT found for tabId:', tabId);
      return false;
    }

    const settings = this.store.getSettings();
    const resolved = resolveUrlOrSearch(urlOrQuery, settings.searchEngine);
    console.log('[TabManager.navigate] resolved URL:', resolved);

    if (resolved === 'adal://newtab') {
      tab.info.isNewTab = true;
      tab.info.url = 'adal://newtab';
      tab.info.title = 'New Tab';
      tab.info.favicon = undefined;
      const anyWc = tab.view.webContents as any;
      tab.info.canGoBack = anyWc.navigationHistory ? anyWc.navigationHistory.canGoBack() : tab.view.webContents.canGoBack();
      tab.info.canGoForward = anyWc.navigationHistory ? anyWc.navigationHistory.canGoForward() : tab.view.webContents.canGoForward();
      this.activeTabId = tabId;
      this.updateViewAttachment(tabId);
      this.broadcastTabs();
      this.broadcastActiveTab();
      return true;
    }

    tab.info.isNewTab = false;
    tab.info.url = resolved;
    tab.info.title = resolved;
    if (resolved.startsWith('file://') && resolved.toLowerCase().endsWith('.pdf')) {
      const fileName = decodeURIComponent(resolved.split(/[/\\]/).pop() || 'Document.pdf');
      tab.info.title = fileName;
    }
    tab.info.isLoading = true;

    this.activeTabId = tabId;
    this.updateViewAttachment(tabId);

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

  private updateViewAttachment(targetTabId?: string): void {
    const activeId = targetTabId || this.activeTabId;
    const win = this.getMainWindow();
    if (!win || win.isDestroyed()) return;

    const activeTab = this.tabs.find((t) => t.id === activeId);

    // 1. Detach all inactive tab views from win.contentView
    for (const t of this.tabs) {
      if (t.id !== activeId) {
        try {
          t.view.setVisible(false);
          if (win.contentView.children.includes(t.view)) {
            win.contentView.removeChildView(t.view);
          }
        } catch (err) {
          console.warn('[TabManager] Error detaching inactive tab view:', err);
        }
      }
    }

    if (!activeTab) {
      return;
    }

    // 2. If active tab is New Tab or view is suspended (e.g. modal is open):
    // Active tab's view must ALSO be detached from win.contentView so that
    // the React NewTabPage / modals render 100% cleanly without native compositor occlusion.
    if (activeTab.info.isNewTab || activeTab.info.url === 'adal://newtab' || this.isViewSuspended) {
      try {
        activeTab.view.setVisible(false);
        if (win.contentView.children.includes(activeTab.view)) {
          win.contentView.removeChildView(activeTab.view);
        }
      } catch (err) {
        console.warn('[TabManager] Error detaching active tab view for newtab:', err);
      }
      return;
    }

    // 3. Active tab is an external website:
    // Attach only this active view, apply bounds, and show it.
    try {
      if (!win.contentView.children.includes(activeTab.view)) {
        win.contentView.addChildView(activeTab.view);
      }
      const x = Math.max(SIDEBAR_WIDTH, Math.round(this.bounds.x));
      const y = Math.max(HEADER_HEIGHT, Math.round(this.bounds.y));
      const width = Math.max(200, Math.round(this.bounds.width));
      const height = Math.max(200, Math.round(this.bounds.height));
      activeTab.view.setBounds({ x, y, width, height });
      activeTab.view.setVisible(true);
    } catch (err) {
      console.warn('[TabManager] Error attaching active tab view:', err);
    }
  }

  goBack(tabId: string): boolean {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return false;
    const wc = tab.view.webContents as any;
    if (wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack()) {
      if (wc.navigationHistory) {
        wc.navigationHistory.goBack();
      } else {
        wc.goBack();
      }
      return true;
    }
    return false;
  }

  goForward(tabId: string): boolean {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return false;
    const wc = tab.view.webContents as any;
    if (wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward()) {
      if (wc.navigationHistory) {
        wc.navigationHistory.goForward();
      } else {
        wc.goForward();
      }
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

  goHome(_tabId: string): boolean {
    const existingNewTab = this.tabs.find((t) => t.info.isNewTab || t.info.url === 'adal://newtab');
    if (existingNewTab) {
      return this.switchTab(existingNewTab.id);
    }
    const newTab = this.createTab('adal://newtab', true);
    return Boolean(newTab);
  }

  handleShortcut(event: Electron.Event, input: Electron.Input): boolean {
    const isCtrl = Boolean(input.control || input.meta);
    const key = (input.key || '').toLowerCase();

    // Ctrl+L -> Focus Address Bar in renderer
    if (isCtrl && key === 'l') {
      event.preventDefault();
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.EVENT_SHORTCUT_FOCUS_URL);
      }
      return true;
    }

    // Ctrl+Shift+T -> Reopen Last Closed Tab
    if (isCtrl && input.shift && key === 't') {
      event.preventDefault();
      this.reopenLastClosedTab();
      return true;
    }

    // Ctrl+T -> Create New Tab
    if (isCtrl && !input.shift && key === 't') {
      event.preventDefault();
      this.createTab('adal://newtab', true);
      return true;
    }

    // Ctrl+W -> Close Active Tab
    if (isCtrl && key === 'w') {
      event.preventDefault();
      if (this.activeTabId) {
        this.closeTab(this.activeTabId);
      }
      return true;
    }

    // Ctrl+R and F5 -> Reload Active Tab
    if ((isCtrl && key === 'r') || input.key === 'F5') {
      event.preventDefault();
      if (this.activeTabId) {
        this.reload(this.activeTabId);
      }
      return true;
    }

    // Alt+Left -> Go Back
    if (input.alt && (input.key === 'ArrowLeft' || input.code === 'ArrowLeft')) {
      event.preventDefault();
      if (this.activeTabId) {
        this.goBack(this.activeTabId);
      }
      return true;
    }

    // Alt+Right -> Go Forward
    if (input.alt && (input.key === 'ArrowRight' || input.code === 'ArrowRight')) {
      event.preventDefault();
      if (this.activeTabId) {
        this.goForward(this.activeTabId);
      }
      return true;
    }

    // Ctrl+D -> Bookmark Current Page
    if (isCtrl && key === 'd') {
      event.preventDefault();
      const activeTab = this.getActiveTab();
      if (activeTab && !activeTab.isNewTab && activeTab.url) {
        this.store.addBookmark({
          title: activeTab.title || activeTab.url,
          url: activeTab.url,
          favicon: activeTab.favicon,
        });
        const win = this.getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.EVENT_BOOKMARKS_UPDATED, this.store.getBookmarks());
          win.webContents.send(IPC_CHANNELS.EVENT_SHORTCUT_BOOKMARK, activeTab.url);
        }
      }
      return true;
    }

    // F12 -> Toggle DevTools
    if (input.key === 'F12') {
      event.preventDefault();
      const win = this.getMainWindow();
      if (win && !win.isDestroyed()) {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        } else {
          win.webContents.openDevTools({ mode: 'detach' });
        }
      }
      return true;
    }

    return false;
  }

  private setupViewEvents(tab: TabInstance): void {
    const wc = tab.view.webContents;

    wc.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        this.handleShortcut(event, input);
      }
    });

    wc.setWindowOpenHandler(({ url }) => {
      // Safe policy: open popup links as a new managed tab inside AdaL Nexus!
      this.createTab(url, true);
      return { action: 'deny' };
    });

    wc.on('context-menu', (_event, params) => {
      const win = this.getMainWindow();
      if (!win || win.isDestroyed()) return;

      const menu = new Menu();

      if (params.linkURL) {
        menu.append(
          new MenuItem({
            label: 'Open link in new tab',
            click: () => {
              this.createTab(params.linkURL, true);
            },
          })
        );
        menu.append(
          new MenuItem({
            label: 'Copy link address',
            click: () => {
              clipboard.writeText(params.linkURL);
            },
          })
        );
        menu.append(new MenuItem({ type: 'separator' }));
      }

      const anyWc = wc as any;
      const canGoBack = anyWc.navigationHistory ? anyWc.navigationHistory.canGoBack() : wc.canGoBack();
      const canGoForward = anyWc.navigationHistory ? anyWc.navigationHistory.canGoForward() : wc.canGoForward();

      menu.append(
        new MenuItem({
          label: 'Back',
          enabled: canGoBack,
          click: () => this.goBack(tab.id),
        })
      );
      menu.append(
        new MenuItem({
          label: 'Forward',
          enabled: canGoForward,
          click: () => this.goForward(tab.id),
        })
      );
      menu.append(
        new MenuItem({
          label: 'Reload',
          click: () => this.reload(tab.id),
        })
      );

      if (params.editFlags.canCopy || (params.selectionText && params.selectionText.length > 0)) {
        menu.append(new MenuItem({ type: 'separator' }));
        menu.append(
          new MenuItem({
            label: 'Copy',
            role: 'copy',
          })
        );
      }

      if (params.isEditable) {
        menu.append(
          new MenuItem({
            label: 'Paste',
            role: 'paste',
          })
        );
        menu.append(
          new MenuItem({
            label: 'Select All',
            role: 'selectAll',
          })
        );
      }

      menu.popup({ window: win });
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
      const anyWc = wc as any;
      tab.info.canGoBack = anyWc.navigationHistory ? anyWc.navigationHistory.canGoBack() : wc.canGoBack();
      tab.info.canGoForward = anyWc.navigationHistory ? anyWc.navigationHistory.canGoForward() : wc.canGoForward();
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
      const anyWc = wc as any;
      tab.info.canGoBack = anyWc.navigationHistory ? anyWc.navigationHistory.canGoBack() : wc.canGoBack();
      tab.info.canGoForward = anyWc.navigationHistory ? anyWc.navigationHistory.canGoForward() : wc.canGoForward();

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

      if (this.activeTabId === tab.id) {
        this.updateViewAttachment(tab.id);
      }
      this.broadcastTabs();
      if (this.activeTabId === tab.id) {
        this.broadcastActiveTab();
      }
    });

    wc.on('did-navigate-in-page', (_event, url) => {
      tab.info.url = url;
      const anyWc = wc as any;
      tab.info.canGoBack = anyWc.navigationHistory ? anyWc.navigationHistory.canGoBack() : wc.canGoBack();
      tab.info.canGoForward = anyWc.navigationHistory ? anyWc.navigationHistory.canGoForward() : wc.canGoForward();
      if (this.activeTabId === tab.id) {
        this.updateViewAttachment(tab.id);
      }
      this.broadcastTabs();
      if (this.activeTabId === tab.id) {
        this.broadcastActiveTab();
      }
    });

    wc.on('render-process-gone', (_event, details) => {
      console.warn(`[TabManager] render-process-gone on tab ${tab.id}:`, details.reason, details.exitCode);
      if (
        (details.reason === 'crashed' || details.reason === 'oom') &&
        !tab.info.isNewTab &&
        tab.info.url &&
        tab.info.url !== 'adal://newtab'
      ) {
        wc.reload();
      }
    });

    wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.log('[TabManager did-fail-load]:', { errorCode, errorDescription, validatedURL });
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
