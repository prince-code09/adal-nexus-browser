import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  BrowserTab,
  Bookmark,
  HistoryItem,
  DownloadItem,
  BrowserSettings,
  ShortcutItem,
} from '../shared/browser-types';
import { TitleBar } from './components/TitleBar';
import { NavigationToolbar } from './components/NavigationToolbar';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { NewTabPage } from './components/NewTabPage';
import { BookmarksModal } from './components/BookmarksModal';
import { HistoryModal } from './components/HistoryModal';
import { DownloadsModal } from './components/DownloadsModal';
import { SettingsModal } from './components/SettingsModal';
import { AddShortcutModal } from './components/AddShortcutModal';
import { AgentModal } from './components/AgentModal';

export const App: React.FC = () => {
  const api = window.adalNexus;

  // Tabs & Navigation State
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeTab, setActiveTab] = useState<BrowserTab | null>(null);

  // Storage State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [settings, setSettings] = useState<BrowserSettings>({
    theme: 'dark',
    searchEngine: 'google',
    homeUrl: 'adal://newtab',
    shortcuts: [],
  });

  // UI State
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('home');
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

  // Sync theme with document.documentElement for Tailwind dark class
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [settings.theme]);

  // Workspace bounds measuring
  const workspaceRef = useRef<HTMLDivElement>(null);

  const syncBounds = useCallback(() => {
    if (!workspaceRef.current || !api) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    api.setBounds({
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  }, [api]);

  // Initial data loading and IPC event listeners
  useEffect(() => {
    if (!api) return;

    // Load initial tabs & active tab
    api.getTabs().then((initialTabs) => {
      setTabs(initialTabs);
      api.getActiveTab().then((currentActive) => {
        if (currentActive) {
          setActiveTab(currentActive);
        } else if (initialTabs.length > 0) {
          setActiveTab(initialTabs[0]);
        }
      }).catch(() => {
        if (initialTabs.length > 0) setActiveTab(initialTabs[0]);
      });
    });

    // Load bookmarks
    api.getBookmarks().then(setBookmarks);

    // Load history
    api.getHistory().then(setHistory);

    // Load downloads
    api.getDownloads().then(setDownloads);

    // Load settings
    api.getBrowserSettings().then((s) => {
      if (s) setSettings(s);
    });

    // Subscribe to updates
    const unsubTabs = api.onTabsUpdated((updatedTabs) => {
      setTabs(updatedTabs);
    });

    const unsubActiveTab = api.onActiveTabChanged((tab) => {
      setActiveTab(tab);
      // Whenever active tab changes, sync bounds to ensure WebContentsView is positioned
      setTimeout(syncBounds, 20);
    });

    const unsubBookmarks = api.onBookmarksUpdated((bms) => {
      setBookmarks(bms);
    });

    const unsubHistory = api.onHistoryUpdated((hist) => {
      setHistory(hist);
    });

    const unsubDownloads = api.onDownloadUpdated((dl) => {
      setDownloads((prev) => {
        const idx = prev.findIndex((item) => item.id === dl.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = dl;
          return next;
        }
        return [dl, ...prev];
      });
    });

    const unsubSettings = api.onSettingsUpdated((s) => {
      setSettings(s);
    });

    return () => {
      unsubTabs();
      unsubActiveTab();
      unsubBookmarks();
      unsubHistory();
      unsubDownloads();
      unsubSettings();
    };
  }, [api, syncBounds]);

  // ResizeObserver for tracking workspace bounds
  useEffect(() => {
    if (!workspaceRef.current) return;
    const observer = new ResizeObserver(() => {
      syncBounds();
    });
    observer.observe(workspaceRef.current);
    window.addEventListener('resize', syncBounds);

    // Initial sync
    syncBounds();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncBounds);
    };
  }, [syncBounds]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleNewTab();
      } else if (isCtrl && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        if (activeTab) {
          handleCloseTab(activeTab.id);
        }
      } else if (isCtrl && e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length > 1 && activeTab) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTab.id);
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + tabs.length) % tabs.length
            : (currentIndex + 1) % tabs.length;
          handleSelectTab(tabs[nextIndex].id);
        }
      } else if (isCtrl && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        if (activeTab) api?.reload(activeTab.id);
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeTab) api?.goBack(activeTab.id);
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeTab) api?.goForward(activeTab.id);
      } else if (isCtrl && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleToggleBookmark();
      } else if (isCtrl && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setIsHistoryOpen((prev) => !prev);
      } else if (isCtrl && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setIsDownloadsOpen((prev) => !prev);
      } else if (e.key === 'F11') {
        e.preventDefault();
        api?.maximize();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Tab Actions
  const handleSelectTab = async (tabId: string) => {
    if (!api) return;
    await api.switchTab(tabId);
    const target = tabs.find((t) => t.id === tabId);
    if (target) {
      setActiveTab(target);
      setTimeout(syncBounds, 10);
    }
  };

  const handleCloseTab = async (tabId: string) => {
    if (!api) return;
    await api.closeTab(tabId);
  };

  const handleNewTab = async () => {
    if (!api) return;
    const newTab = await api.createTab('adal://newtab');
    if (newTab) {
      setActiveTab(newTab);
    }
  };

  // Navigation Actions
  const handleNavigate = async (urlOrQuery: string) => {
    if (!api) return;
    const trimmed = urlOrQuery.trim();
    if (!trimmed) return;

    // Immediately synchronize workspace bounds
    syncBounds();

    if (!activeTab) {
      const created = await api.createTab(trimmed);
      if (created) {
        setActiveTab(created);
      }
    } else {
      // Optimistically update active tab so NewTabPage immediately unmounts
      // and WebContentsView displays the real website or search results
      const isStillNewTab = trimmed === 'adal://newtab';
      setActiveTab((prev) =>
        prev
          ? {
              ...prev,
              isNewTab: isStillNewTab,
              url: trimmed,
              isLoading: !isStillNewTab,
            }
          : prev
      );
      await api.navigate(activeTab.id, trimmed);
    }
  };

  const handleGoBack = () => {
    if (activeTab) api?.goBack(activeTab.id);
  };

  const handleGoForward = () => {
    if (activeTab) api?.goForward(activeTab.id);
  };

  const handleReload = () => {
    if (activeTab) api?.reload(activeTab.id);
  };

  const handleStop = () => {
    if (activeTab) api?.stop(activeTab.id);
  };

  const handleGoHome = () => {
    if (activeTab) api?.goHome(activeTab.id);
  };

  // Bookmarks Actions
  const isCurrentPageBookmarked = Boolean(
    activeTab &&
      !activeTab.isNewTab &&
      activeTab.url &&
      bookmarks.some((b) => b.url === activeTab.url)
  );

  const handleToggleBookmark = () => {
    if (!activeTab || activeTab.isNewTab || !activeTab.url) return;
    if (isCurrentPageBookmarked) {
      api?.removeBookmark(activeTab.url);
    } else {
      api?.addBookmark({
        title: activeTab.title || activeTab.url,
        url: activeTab.url,
        favicon: activeTab.favicon,
      });
    }
  };

  const handleRemoveBookmark = (id: string) => {
    api?.removeBookmark(id);
  };

  // History Actions
  const handleClearHistory = () => {
    api?.clearHistory();
  };

  const handleRemoveHistoryItem = (id: string) => {
    api?.removeHistoryItem(id);
  };

  // Download Actions
  const handleOpenFile = (id: string) => {
    api?.openDownloadFile(id);
  };

  const handleShowInFolder = (id: string) => {
    api?.showDownloadInFolder(id);
  };

  const handleCancelDownload = (id: string) => {
    api?.cancelDownload(id);
  };

  // Settings Actions
  const handleSaveSettings = (newSettings: Partial<BrowserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    api?.saveBrowserSettings(newSettings);
  };

  // Quick toggle theme handler
  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
    handleSaveSettings({ theme: nextTheme });
  };

  // Shortcuts Actions
  const handleAddShortcut = (item: Omit<ShortcutItem, 'id'>) => {
    const newShortcut: ShortcutItem = {
      ...item,
      id: `sc-${Date.now()}`,
    };
    const updated = [...(settings.shortcuts || []), newShortcut];
    handleSaveSettings({ shortcuts: updated });
  };

  const handleDeleteShortcut = (id: string) => {
    const updated = (settings.shortcuts || []).filter((s) => s.id !== id);
    handleSaveSettings({ shortcuts: updated });
  };

  // Sidebar item selection handler
  const handleSidebarSelect = (tab: SidebarTab) => {
    setSidebarTab(tab);
    if (tab === 'home') {
      handleGoHome();
    } else if (tab === 'bookmarks') {
      setIsBookmarksOpen(true);
    } else if (tab === 'history') {
      setIsHistoryOpen(true);
    } else if (tab === 'downloads') {
      setIsDownloadsOpen(true);
    } else if (tab === 'settings') {
      setIsSettingsOpen(true);
    } else if (tab === 'extensions') {
      setIsAgentModalOpen(true);
    }
  };

  const activeDownloadsCount = downloads.filter((d) => d.state === 'progressing').length;

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden select-none transition-colors duration-150 ${
        settings.theme === 'light' ? 'light bg-slate-100 text-slate-800' : 'dark bg-[#090b14] text-slate-100'
      }`}
    >
      {/* 1. Custom Title Bar with Chrome Tabs & Windows Controls */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTab?.id || ''}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        theme={settings.theme}
      />

      {/* 2. Navigation Toolbar with Back, Forward, Reload, Address Bar, Bookmarks, Downloads, Theme Toggle, AI badge */}
      <NavigationToolbar
        activeTab={activeTab}
        isBookmarked={isCurrentPageBookmarked}
        activeDownloadsCount={activeDownloadsCount}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onStop={handleStop}
        onGoHome={handleGoHome}
        onToggleBookmark={handleToggleBookmark}
        onToggleDownloads={() => setIsDownloadsOpen((prev) => !prev)}
        onOpenAgentModal={() => setIsAgentModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 3. Main Body: Sidebar + Browser Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={sidebarTab}
          onSelectTab={handleSidebarSelect}
          onOpenAgentModal={() => setIsAgentModalOpen(true)}
          theme={settings.theme}
        />

        {/* Main Browser Workspace */}
        <main
          ref={workspaceRef}
          className={`flex-1 h-full relative overflow-hidden transition-colors duration-150 ${
            settings.theme === 'light' ? 'bg-slate-100' : 'bg-[#090b14]'
          }`}
        >
          {/* If the active tab is on New Tab, render the rich New Tab Page with per-tab state */}
          {(!activeTab || activeTab.isNewTab || activeTab.url === 'adal://newtab') ? (
            <NewTabPage
              key={activeTab?.id || 'newtab-empty'}
              shortcuts={settings.shortcuts || []}
              onNavigate={handleNavigate}
              onAddShortcutClick={() => setIsAddShortcutOpen(true)}
              onDeleteShortcut={handleDeleteShortcut}
              onCustomizeClick={() => setIsSettingsOpen(true)}
              theme={settings.theme}
            />
          ) : (
            /* When active tab is on an external website:
               In Electron: native WebContentsView is placed directly over workspaceRef to render the real website.
               In external browser preview: display desktop application status banner. */
            (!window.electronAPI) && (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className={`max-w-md p-6 rounded-2xl border shadow-xl space-y-4 ${
                  settings.theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0f1424] border-white/10 text-white'
                }`}>
                  <div className="text-base font-bold">
                    AdaL Nexus Desktop Application
                  </div>
                  <p className="text-xs text-slate-400">
                    Navigated to: <span className="font-mono text-violet-400 break-all">{activeTab.url}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Real Chromium WebContentsView renders directly in the AdaL Nexus desktop window. To view, switch to the desktop app or run <code className="px-1.5 py-0.5 rounded bg-violet-950 text-violet-300">npm run dev</code>.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleNavigate('adal://newtab')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                        settings.theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/15 text-slate-200'
                      }`}
                    >
                      Back to New Tab
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(activeTab.url, '_blank')}
                      className="px-3 py-1.5 rounded-xl text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-md shadow-violet-600/30 cursor-pointer"
                    >
                      Open in External Browser ↗
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </main>
      </div>

      {/* Modals & Flyouts */}
      <BookmarksModal
        isOpen={isBookmarksOpen}
        bookmarks={bookmarks}
        onClose={() => setIsBookmarksOpen(false)}
        onOpenBookmark={handleNavigate}
        onRemoveBookmark={handleRemoveBookmark}
        theme={settings.theme}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        history={history}
        onClose={() => setIsHistoryOpen(false)}
        onOpenUrl={handleNavigate}
        onClearHistory={handleClearHistory}
        onRemoveItem={handleRemoveHistoryItem}
        theme={settings.theme}
      />

      <DownloadsModal
        isOpen={isDownloadsOpen}
        downloads={downloads}
        onClose={() => setIsDownloadsOpen(false)}
        onOpenFile={handleOpenFile}
        onShowInFolder={handleShowInFolder}
        onCancelDownload={handleCancelDownload}
        theme={settings.theme}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={handleSaveSettings}
        onClearHistory={handleClearHistory}
      />

      <AddShortcutModal
        isOpen={isAddShortcutOpen}
        onClose={() => setIsAddShortcutOpen(false)}
        onAddShortcut={handleAddShortcut}
        theme={settings.theme}
      />

      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        theme={settings.theme}
      />
    </div>
  );
};
export default App;
