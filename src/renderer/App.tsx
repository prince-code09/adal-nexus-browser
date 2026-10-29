import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  BrowserTab,
  Bookmark,
  HistoryItem,
  DownloadItem,
  BrowserSettings,
  ShortcutItem,
} from '../shared/browser-types';
import type {
  ChatMessage,
  TabAgentWorkspace,
  ArtifactItem,
  AttachedImage,
} from '../shared/types';
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
import { CompanionPanel } from './components/CompanionPanel';
import { PerformanceModal } from './components/PerformanceModal';
import { SecurityModal } from './components/SecurityModal';
import { ExtensionsModal } from './components/ExtensionsModal';
import { resolveUrlOrSearch } from '../shared/url-resolver';

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
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);

  const isAnyModalOpen = Boolean(
    isBookmarksOpen ||
    isHistoryOpen ||
    isDownloadsOpen ||
    isSettingsOpen ||
    isAddShortcutOpen ||
    isAgentModalOpen ||
    isPerfModalOpen ||
    isSecurityModalOpen ||
    isExtensionsOpen
  );

  useEffect(() => {
    if (api?.setViewVisible) {
      api.setViewVisible(!isAnyModalOpen);
    }
  }, [isAnyModalOpen, api]);

  // AI Agent & Automation State per-tab
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [tabWorkspaces, setTabWorkspaces] = useState<Record<string, TabAgentWorkspace>>({});
  const [globalArtifacts, setGlobalArtifacts] = useState<ArtifactItem[]>([]);

  const refreshArtifacts = useCallback(async () => {
    try {
      const getFn = window.electronAPI?.getAllArtifacts || window.adalNexus?.getAllArtifacts;
      if (getFn) {
        const items = await getFn();
        if (items && Array.isArray(items)) {
          setGlobalArtifacts(items);
        }
      }
    } catch (err) {
      console.warn('[App] Error refreshing artifacts:', err);
    }
  }, []);

  useEffect(() => {
    refreshArtifacts();
  }, [refreshArtifacts]);

  const taskIdToTabIdRef = useRef<Record<string, string>>({});
  const activeTabIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeTabIdRef.current = activeTab?.id || null;
  }, [activeTab]);

  // Derive active tab workspace
  const currentWorkspace: TabAgentWorkspace = (activeTab && tabWorkspaces[activeTab.id]) || {
    tabId: activeTab?.id || 'default',
    messages: [],
    currentGoal: '',
    taskStatus: 'idle',
    verificationStatus: 'UNVERIFIED',
    plan: null,
    logs: [],
    pendingApproval: null,
    currentTaskId: null,
    artifacts: [],
  };

  const updateTabWorkspace = useCallback(
    (tabId: string, updater: (prev: TabAgentWorkspace) => TabAgentWorkspace) => {
      setTabWorkspaces((prev) => {
        const existing = prev[tabId] || {
          tabId,
          messages: [],
          currentGoal: '',
          taskStatus: 'idle',
          verificationStatus: 'UNVERIFIED',
          plan: null,
          logs: [],
          pendingApproval: null,
          currentTaskId: null,
          artifacts: [],
        };
        return {
          ...prev,
          [tabId]: updater(existing),
        };
      });
    },
    []
  );

  // Sync theme with document.documentElement for Tailwind dark class
  useEffect(() => {
    const isLightMode =
      settings.themeMode === 'soft-light' ||
      (settings.theme === 'light' &&
        settings.themeMode !== 'dark-cosmic' &&
        settings.themeMode !== 'live-wallpaper');

    if (isLightMode) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  }, [settings.theme, settings.themeMode]);

  // Workspace bounds measuring
  const workspaceRef = useRef<HTMLDivElement>(null);

  const syncBounds = useCallback(() => {
    if (!workspaceRef.current || !api) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    // Safety enforcement: website WebContentsView MUST start strictly below the browser toolbar (84px)
    // and strictly to the right of the sidebar (72px). Under no condition may it cover the browser UI.
    const x = Math.max(72, Math.round(rect.left));
    const y = Math.max(84, Math.round(rect.top));
    const width = Math.max(200, Math.round(rect.width));
    const height = Math.max(200, Math.round(rect.height));
    api.setBounds({
      x,
      y,
      width,
      height,
    });
  }, [api]);

  // Initial data loading and IPC event listeners
  useEffect(() => {
    if (!api) return;

    // Load initial tabs & active tab
    api.getTabs().then((initialTabs) => {
      setTabs(initialTabs);
      api
        .getActiveTab()
        .then((currentActive) => {
          if (currentActive) {
            setActiveTab(currentActive);
          } else if (initialTabs.length > 0) {
            setActiveTab(initialTabs[0]);
          }
        })
        .catch(() => {
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
      setTabWorkspaces((prev) => {
        const liveTabIds = new Set(updatedTabs.map((t) => t.id));
        const next: Record<string, TabAgentWorkspace> = {};
        for (const [key, val] of Object.entries(prev)) {
          if (liveTabIds.has(key)) {
            next[key] = val;
          }
        }
        return next;
      });
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

  // Subscribe to AI Agent and automation events
  useEffect(() => {
    const electron = window.electronAPI;
    if (!electron) return;

    const unsubPlan = electron.onPlanUpdated?.((updatedPlan) => {
      const tabId = activeTabIdRef.current || 'default';
      updateTabWorkspace(tabId, (prev) => ({
        ...prev,
        plan: updatedPlan,
      }));
    });

    const unsubStep = electron.onStepUpdated?.((updatedStep) => {
      const tabId = activeTabIdRef.current || 'default';
      updateTabWorkspace(tabId, (prev) => {
        if (!prev.plan) return prev;
        return {
          ...prev,
          plan: {
            ...prev.plan,
            steps: prev.plan.steps.map((s) => (s.id === updatedStep.id ? updatedStep : s)),
          },
        };
      });
    });

    const unsubLog = electron.onLogAdded?.((log) => {
      const tabId = activeTabIdRef.current || 'default';
      updateTabWorkspace(tabId, (prev) => ({
        ...prev,
        logs: [...prev.logs, log],
      }));
    });

    const unsubStatus = electron.onTaskStatusChanged?.((data) => {
      const targetTabId = taskIdToTabIdRef.current[data.taskId] || activeTabIdRef.current || 'default';

      updateTabWorkspace(targetTabId, (prev) => {
        const updatedArtifacts =
          data.taskRecord?.artifacts && data.taskRecord.artifacts.length > 0
            ? data.taskRecord.artifacts
            : prev.artifacts;

        const nextMessages = [...prev.messages];

        if (data.status === 'completed' && prev.taskStatus !== 'completed') {
          const isHi = /[\u0900-\u097F]/.test(prev.currentGoal);
          const isHinglish =
            /\b(karo|kijiye|banao|dhundho|dhoondo|khojo|dekho|batao|chahiye|hai|aur|kaise|kar|raha|rahe|kya|unka|mujhe)\b/i.test(
              prev.currentGoal
            );

          const planSteps = data.taskRecord?.plan?.steps || prev.plan?.steps || [];
          const hasChatResponse = planSteps.some((s) => s.tool === 'chat_response');
          const hasOpenTab = planSteps.some((s) => s.tool === 'browser_open_tab' || s.tool === 'browser_navigate');
          const hasLinkedInPost = planSteps.some((s) => s.tool === 'browser_linkedin_post');
          const hasYouTubePlay = planSteps.some((s) => s.tool === 'browser_youtube_play');
          const hasVisualMatch = planSteps.some((s) => s.tool === 'browser_visual_match');
          const hasNotesGallery = planSteps.some(
            (s) => s.tool === 'notes_gallery_search_and_open' || s.tool === 'notes_gallery_open'
          );
          const hasPdf =
            data.taskRecord?.pdfReportPath ||
            updatedArtifacts.some((a) => a.path?.endsWith('.pdf'));

          // Mode A: Pure conversational response (no tabs, no tables, no PDF cards)
          if (
            hasChatResponse ||
            (planSteps.length <= 1 &&
              !hasOpenTab &&
              !hasLinkedInPost &&
              !hasYouTubePlay &&
              !hasNotesGallery &&
              !hasPdf &&
              !data.taskRecord?.findings?.length)
          ) {
            const answer =
              data.taskRecord?.resultSummary ||
              data.taskRecord?.plan?.summary ||
              'Response completed.';
            nextMessages.push({
              id: `msg-done-${Date.now()}`,
              sender: 'agent',
              content: answer,
              timestamp: Date.now(),
              status: 'success',
              plan: data.taskRecord?.plan || prev.plan || undefined,
              artifacts: [],
              verificationStatus: data.verificationStatus,
            });
          }
          // Mode B: Explicit Website Open
          else if (hasOpenTab && !hasLinkedInPost && !hasYouTubePlay && !hasPdf) {
            const confirmMsg =
              data.taskRecord?.resultSummary ||
              (isHi
                ? 'वेबसाइट आपके सक्रिय ब्राउज़र टैब में खोल दी गई है।'
                : isHinglish
                ? 'Website aapke active browser tab me open kar di gayi hai.'
                : 'Target website has been opened in your active browser tab.');

            nextMessages.push({
              id: `msg-done-${Date.now()}`,
              sender: 'agent',
              content: confirmMsg,
              timestamp: Date.now(),
              status: 'success',
              plan: data.taskRecord?.plan || prev.plan || undefined,
              artifacts: [],
              verificationStatus: data.verificationStatus,
            });
          }
          // Mode: YouTube Playback
          else if (hasYouTubePlay && !hasPdf) {
            const playMsg =
              data.taskRecord?.resultSummary ||
              (isHi
                ? 'यूट्यूब सक्रिय ब्राउज़र टैब में खोल दिया गया है और वीडियो प्लेबैक प्रारंभ कर दिया गया है।'
                : isHinglish
                ? 'YouTube open karke video/playlist playback shuru kar diya gaya hai.'
                : 'YouTube playback initiated in active browser tab.');

            nextMessages.push({
              id: `msg-done-${Date.now()}`,
              sender: 'agent',
              content: playMsg,
              timestamp: Date.now(),
              status: 'success',
              plan: data.taskRecord?.plan || prev.plan || undefined,
              artifacts: [],
              verificationStatus: data.verificationStatus,
            });
          }
          // Mode: Visual Image Matching
          else if (hasVisualMatch && !hasPdf) {
            const visualMsg =
              data.taskRecord?.resultSummary ||
              (isHi
                ? 'छवि विश्लेषण और दृश्य मिलान खोज पूरी हो गई है। परिणाम आपके ब्राउज़र टैब में प्रदर्शित किए गए हैं।'
                : isHinglish
                ? 'Uploaded image ke visual features analyze karke visually matching images aapke browser tab me display kar di gayi hain.'
                : 'Visual image analysis completed. Visually matching results and web sources have been opened in your browser tab.');

            nextMessages.push({
              id: `msg-done-${Date.now()}`,
              sender: 'agent',
              content: visualMsg,
              timestamp: Date.now(),
              status: 'success',
              plan: data.taskRecord?.plan || prev.plan || undefined,
              artifacts: [],
              verificationStatus: data.verificationStatus,
            });
          }
          // Mode: Notes Gallery / PYQs
          else if (hasNotesGallery && !hasPdf) {
            const notesMsg =
              data.taskRecord?.resultSummary ||
              (isHi
                ? 'नोट्स गैलरी खोज पूरी हो गई है।'
                : isHinglish
                ? 'Notes Gallery search complete ho gayi hai.'
                : 'Notes Gallery search completed.');

            nextMessages.push({
              id: `msg-done-${Date.now()}`,
              sender: 'agent',
              content: notesMsg,
              timestamp: Date.now(),
              status: 'success',
              plan: data.taskRecord?.plan || prev.plan || undefined,
              artifacts: [],
              verificationStatus: data.verificationStatus,
            });
          }
          // Mode C: Explicit Website Action (LinkedIn post, etc.)
          else if (hasLinkedInPost && !hasPdf) {
            const actionMsg =
              data.taskRecord?.resultSummary ||
              (isHi
                ? 'लिंक्डइन पोस्ट कार्य सफलतापूर्वक निष्पादित किया गया।'
                : isHinglish
                ? 'LinkedIn post action successfully execute ho gaya.'
                : 'LinkedIn post action successfully executed.');

            nextMessages.push({
              id: `msg-done-${Date.now()}`,
              sender: 'agent',
              content: actionMsg,
              timestamp: Date.now(),
              status: 'success',
              plan: data.taskRecord?.plan || prev.plan || undefined,
              artifacts: [],
              verificationStatus: data.verificationStatus,
            });
          }
          // Mode D: Multi-step Research with PDF deliverables
          else {
            const findingsList: string[] = [];
            if (data.taskRecord?.findings && Array.isArray(data.taskRecord.findings)) {
              data.taskRecord.findings.forEach((f: any) => {
                const name = f.company_name || f.name || f.title || f.Company || f.company;
                const product = f.product || f.Product || f.description || f.category;
                const pricing = f.pricing || f.price || f.Pricing || f.PricingModel;
                const url = f.source_url || f.url || f.link || f.source;
                if (name) {
                  const parts = [name];
                  if (product) parts.push(product);
                  if (pricing) parts.push(`Pricing: ${pricing}`);
                  if (url) parts.push(`(${url})`);
                  findingsList.push(parts.join(' — '));
                } else if (typeof f === 'string') {
                  findingsList.push(f);
                }
              });
            }

            const pdfPath =
              data.taskRecord?.pdfReportPath ||
              updatedArtifacts.find((a) => a.path?.endsWith('.pdf'))?.path;

            const completionContent = isHi
              ? `शोध कार्य सफलतापूर्वक पूर्ण हुआ और सभी निष्कर्ष सत्यापित कर लिए गए हैं। मुख्य निष्कर्ष और सारांश नीचे दिए गए हैं:`
              : isHinglish
              ? `Research successfully complete ho gaya hai aur findings verify ho chuki hain! Neeche verified details aur consolidated report available hai:`
              : `Research successfully completed and independently verified! Key findings, pricing details, and citations are summarized below:`;

            nextMessages.push({
              id: `msg-done-${Date.now()}`,
              sender: 'agent',
              content: completionContent,
              timestamp: Date.now(),
              status: 'success',
              plan: data.taskRecord?.plan || prev.plan || undefined,
              artifacts: updatedArtifacts,
              verificationStatus: data.verificationStatus,
              keyFindings: findingsList.length > 0 ? findingsList : undefined,
              findingsData: data.taskRecord?.findings || undefined,
              conclusion: data.taskRecord?.resultSummary || undefined,
              pdfPath,
            });
            refreshArtifacts();
          }
        } else if (data.status === 'failed' && prev.taskStatus !== 'failed') {
          const isHi = /[\u0900-\u097F]/.test(prev.currentGoal);
          const isHinglish =
            /\b(karo|kijiye|banao|dhundho|dhoondo|khojo|dekho|batao|chahiye|hai|aur|kaise|kar|raha|rahe|kya|unka|mujhe)\b/i.test(
              prev.currentGoal
            );

          nextMessages.push({
            id: `msg-fail-${Date.now()}`,
            sender: 'agent',
            content: isHi
              ? `टास्क निष्पादन असफल रहा। ${data.taskRecord?.error || 'कृपया पुनः प्रयास करें।'}`
              : isHinglish
              ? `Task execution fail ho gaya. ${data.taskRecord?.error || 'Kripya dubara try karein.'}`
              : `Task execution failed: ${data.taskRecord?.error || 'Please try again.'}`,
            timestamp: Date.now(),
            status: 'error',
          });
        }

        return {
          ...prev,
          taskStatus: data.status,
          verificationStatus: data.verificationStatus,
          artifacts: updatedArtifacts,
          messages: nextMessages,
        };
      });
    });

    const unsubApproval = electron.onApprovalRequested?.((req) => {
      const tabId = activeTabIdRef.current || 'default';
      updateTabWorkspace(tabId, (prev) => ({
        ...prev,
        pendingApproval: req,
        taskStatus: 'waiting_approval',
      }));
    });

    return () => {
      unsubPlan?.();
      unsubStep?.();
      unsubLog?.();
      unsubStatus?.();
      unsubApproval?.();
    };
  }, [updateTabWorkspace]);

  // Synchronize browser bounds whenever agent panel opens or closes
  useEffect(() => {
    const timer = setTimeout(() => {
      syncBounds();
    }, 40);
    return () => clearTimeout(timer);
  }, [isAgentOpen, syncBounds]);

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
    setTabWorkspaces((prev) => {
      const copy = { ...prev };
      delete copy[tabId];
      return copy;
    });
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

    const resolved = resolveUrlOrSearch(trimmed, settings.searchEngine);
    const isStillNewTab = resolved === 'adal://newtab';

    if (!activeTab) {
      const created = await api.createTab(resolved);
      if (created) {
        setActiveTab(created);
      }
    } else {
      // Optimistically update active tab so NewTabPage immediately unmounts
      // and WebContentsView displays the real website or search results
      setActiveTab((prev) =>
        prev
          ? {
              ...prev,
              isNewTab: isStillNewTab,
              url: resolved,
              isLoading: !isStillNewTab,
            }
          : prev
      );
      await api.navigate(activeTab.id, resolved);
      setTimeout(syncBounds, 30);
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

  const handleGoHome = async () => {
    const existingHome = tabs.find((t) => t.isNewTab || t.url === 'adal://newtab');
    if (existingHome) {
      await handleSelectTab(existingHome.id);
    } else {
      await handleNewTab();
    }
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
    const isCurrentlyLight =
      settings.themeMode === 'soft-light' ||
      (settings.theme === 'light' &&
        settings.themeMode !== 'dark-cosmic' &&
        settings.themeMode !== 'live-wallpaper');

    if (isCurrentlyLight) {
      handleSaveSettings({
        theme: 'dark',
        themeMode: 'dark-cosmic',
        backgroundMode: 'cosmic',
      });
    } else {
      handleSaveSettings({
        theme: 'light',
        themeMode: 'soft-light',
        backgroundMode: 'white',
      });
    }
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
      setIsExtensionsOpen(true);
    }
  };

  // Agent Actions
  const handleStartTask = async (goal: string, attachedImage?: AttachedImage) => {
    const currentTabId = activeTab?.id || 'default';

    // Detect language
    const isHi = /[\u0900-\u097F]/.test(goal);
    const isHinglish =
      /\b(karo|kijiye|banao|dhundho|dhoondo|khojo|dekho|batao|chahiye|hai|aur|kaise|kar|raha|rahe|kya|unka|mujhe)\b/i.test(
        goal
      );

    const lower = goal.toLowerCase();
    const isInformational =
      lower.startsWith('what is') ||
      lower.startsWith('who is') ||
      lower.startsWith('how to') ||
      lower.startsWith('how do') ||
      lower.startsWith('which ') ||
      lower.startsWith('explain') ||
      lower.includes('kya hai') ||
      lower.includes('kaise') ||
      lower.includes('kaun sa') ||
      lower.includes('steps batao') ||
      lower.includes('requirements kya');

    const isOpenSite =
      !isInformational &&
      (lower.includes('kholo') ||
        lower.includes('open karo') ||
        lower.includes('khol kar dikhao') ||
        lower.includes('open in') ||
        lower.startsWith('open ') ||
        lower.startsWith('visit ') ||
        lower.startsWith('go to '));

    const isLinkedInPost =
      !isInformational &&
      (lower.includes('linkedin') || lower.includes('post')) &&
      (lower.includes('upload') || lower.includes('publish') || lower.includes('dalo') || lower.includes('daalo'));

    const isVisualMatch =
      !isInformational &&
      (lower.includes('visual matched') ||
        lower.includes('visual match') ||
        lower.includes('matching images') ||
        lower.includes('matching image') ||
        lower.includes('similar images') ||
        lower.includes('similar image') ||
        lower.includes('reverse image') ||
        lower.includes('photo se search') ||
        lower.includes('image search')) &&
      (!!attachedImage || lower.includes('image') || lower.includes('photo'));

    let ackContent = '';
    if (isInformational) {
      ackContent = isHi
        ? `आपके प्रश्न पर विचार कर रहा हूँ: "${goal}"...`
        : isHinglish
        ? `Aapke question ko analyze kar raha hoon: "${goal}"...`
        : `Analyzing your question: "${goal}"...`;
    } else if (isVisualMatch) {
      ackContent = isHi
        ? `छवि की दृश्य विशेषताओं का विश्लेषण कर रहा हूँ और दृश्य मिलान खोज रहा हूँ...`
        : isHinglish
        ? `Uploaded image ko analyze karke visually matching images search kar raha hoon...`
        : `Analyzing visual features of image to locate matching web results...`;
    } else if (isOpenSite) {
      ackContent = isHi
        ? `वेबसाइट खोलने की तैयारी कर रहा हूँ: "${goal}"...`
        : isHinglish
        ? `Website browser tab me open kar raha hoon...`
        : `Opening target website in your browser tab...`;
    } else if (isLinkedInPost) {
      ackContent = isHi
        ? `लिंक्डइन पोस्ट प्रक्रिया प्रारंभ कर रहा हूँ...`
        : isHinglish
        ? `LinkedIn post workflow initialize kar raha hoon...`
        : `Preparing LinkedIn post workflow...`;
    } else {
      ackContent = isHi
        ? `नमस्ते! मैंने आपका निर्देश प्राप्त कर लिया है: "${goal}"। मैं योजना तैयार कर रहा हूँ और ब्राउज़र ऑटोमेशन शुरू कर रहा हूँ...`
        : isHinglish
        ? `Task samajh gaya hoon: "${goal}"। Plan create karke target websites research kar raha hoon...`
        : `Understood your goal: "${goal}". Preparing execution plan...`;
    }

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      content: goal,
      timestamp: Date.now(),
      attachedImage,
    };

    const agentAckMsg: ChatMessage = {
      id: `msg-agent-${Date.now() + 1}-${Math.random().toString(36).slice(2, 6)}`,
      sender: 'agent',
      content: ackContent,
      timestamp: Date.now() + 1,
      status: 'pending',
    };

    updateTabWorkspace(currentTabId, (prev) => ({
      ...prev,
      currentGoal: goal,
      messages: [...prev.messages, userMsg, agentAckMsg],
      logs: [],
      plan: null,
      pendingApproval: null,
      artifacts: prev.artifacts,
      taskStatus: 'planning',
      verificationStatus: 'UNVERIFIED',
    }));

    const previousUserMessages = currentWorkspace.messages
      .filter((m) => m.sender === 'user')
      .map((m) => m.content);

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.startTask(goal, {
          previousQueries: previousUserMessages,
          attachedImage,
        });
        if (res?.taskId) {
          taskIdToTabIdRef.current[res.taskId] = currentTabId;
          updateTabWorkspace(currentTabId, (prev) => ({
            ...prev,
            currentTaskId: res.taskId,
          }));
        }
      } catch (err: any) {
        console.error('[App] Failed to start agent task:', err);
        updateTabWorkspace(currentTabId, (prev) => ({
          ...prev,
          taskStatus: 'failed',
          messages: [
            ...prev.messages,
            {
              id: `msg-err-${Date.now()}`,
              sender: 'agent',
              content: isHi
                ? `त्रुटि: टास्क शुरू करने में असमर्थ। (${err?.message || 'अज्ञात त्रुटि'})`
                : isHinglish
                ? `Error: Task start nahi ho paya. (${err?.message || 'Unknown error'})`
                : `Error: Unable to start research task. (${err?.message || 'Unknown error'})`,
              timestamp: Date.now(),
              status: 'error',
            },
          ],
        }));
      }
    }
  };

  const handleCancelTask = async () => {
    const currentTabId = activeTab?.id || 'default';
    const taskId = currentWorkspace.currentTaskId;
    if (taskId && window.electronAPI) {
      await window.electronAPI.cancelTask(taskId);
    }
    updateTabWorkspace(currentTabId, (prev) => ({
      ...prev,
      taskStatus: 'cancelled',
    }));
  };

  const handleApprovalResponse = async (requestId: string, approved: boolean) => {
    const currentTabId = activeTab?.id || 'default';
    if (window.electronAPI) {
      await window.electronAPI.respondApproval(requestId, approved);
    }
    updateTabWorkspace(currentTabId, (prev) => ({
      ...prev,
      pendingApproval: null,
    }));
  };

  const handleOpenArtifact = async (filePath: string) => {
    if (window.electronAPI) {
      await window.electronAPI.openArtifact(filePath);
    }
  };

  const handleNewChat = async () => {
    const currentTabId = activeTab?.id || 'default';
    const workspace = tabWorkspaces[currentTabId];

    if (
      workspace?.currentTaskId &&
      (workspace.taskStatus === 'planning' ||
        workspace.taskStatus === 'executing' ||
        workspace.taskStatus === 'verifying')
    ) {
      try {
        if (window.electronAPI) {
          await window.electronAPI.cancelTask(workspace.currentTaskId);
        }
      } catch (err) {
        console.warn('[App] Error cancelling running task for New Chat:', err);
      }
    }

    updateTabWorkspace(currentTabId, (prev) => ({
      ...prev,
      messages: [],
      currentGoal: '',
      taskStatus: 'idle',
      verificationStatus: 'UNVERIFIED',
      plan: null,
      logs: [],
      pendingApproval: null,
      currentTaskId: null,
      artifacts: [],
    }));

    await refreshArtifacts();
  };

  const handleDeleteArtifact = async (filePath: string) => {
    try {
      const deleteFn = window.electronAPI?.deleteArtifact || window.adalNexus?.deleteArtifact;
      if (deleteFn) {
        await deleteFn(filePath);
        await refreshArtifacts();
      }
    } catch (err: any) {
      console.error('[App] Failed to delete artifact:', err);
      alert(`Failed to delete report: ${err?.message || 'File not found'}`);
    }
  };

  const activeDownloadsCount = downloads.filter((d) => d.state === 'progressing').length;

  const currentSidebarActive: SidebarTab | '' = isBookmarksOpen
    ? 'bookmarks'
    : isHistoryOpen
    ? 'history'
    : isDownloadsOpen
    ? 'downloads'
    : isSettingsOpen
    ? 'settings'
    : isExtensionsOpen
    ? 'extensions'
    : activeTab?.isNewTab || activeTab?.url === 'adal://newtab'
    ? 'home'
    : '';

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
        onOpenAgentModal={() => setIsAgentOpen((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 3. Main Body: Sidebar + Browser Workspace + AI Agent Companion */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={currentSidebarActive}
          onSelectTab={handleSidebarSelect}
          onOpenAgentModal={() => setIsAgentOpen((prev) => !prev)}
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
          {!activeTab || activeTab.isNewTab || activeTab.url === 'adal://newtab' ? (
            <NewTabPage
              key={activeTab?.id || 'newtab-empty'}
              shortcuts={settings.shortcuts || []}
              onNavigate={handleNavigate}
              onAddShortcutClick={() => setIsAddShortcutOpen(true)}
              onDeleteShortcut={handleDeleteShortcut}
              onCustomizeClick={() => setIsSettingsOpen(true)}
              onOpenFast={() => setIsPerfModalOpen(true)}
              onOpenSecure={() => setIsSecurityModalOpen(true)}
              onOpenSmart={() => setIsAgentOpen(true)}
              theme={settings.theme}
              themeMode={settings.themeMode}
              backgroundMode={settings.backgroundMode || 'cosmic'}
            />
          ) : (
            /* When active tab is on an external website:
               In Electron: native WebContentsView is placed directly over workspaceRef to render the real website.
               In external browser preview: display desktop application status banner. */
            !window.electronAPI && (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div
                  className={`max-w-md p-6 rounded-2xl border shadow-xl space-y-4 ${
                    settings.theme === 'light'
                      ? 'bg-white border-slate-200 text-slate-800'
                      : 'bg-[#0f1424] border-white/10 text-white'
                  }`}
                >
                  <div className="text-base font-bold">AdaL Nexus Desktop Application</div>
                  <p className="text-xs text-slate-400">
                    Navigated to: <span className="font-mono text-violet-400 break-all">{activeTab.url}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Real Chromium WebContentsView renders directly in the AdaL Nexus desktop window. To view, switch
                    to the desktop app or run <code className="px-1.5 py-0.5 rounded bg-violet-950 text-violet-300">npm run dev</code>.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleNavigate('adal://newtab')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${
                        settings.theme === 'light'
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-white/10 hover:bg-white/15 text-slate-200'
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

        {/* Right Collapsible AI Agent Companion Panel */}
        {isAgentOpen && (
          <CompanionPanel
            tabId={activeTab?.id || 'tab-default'}
            currentGoal={currentWorkspace.currentGoal}
            messages={currentWorkspace.messages}
            onStartTask={handleStartTask}
            onCancelTask={handleCancelTask}
            onNewChat={handleNewChat}
            taskStatus={currentWorkspace.taskStatus}
            verificationStatus={currentWorkspace.verificationStatus}
            plan={currentWorkspace.plan}
            logs={currentWorkspace.logs}
            pendingApproval={currentWorkspace.pendingApproval}
            onApprovalResponse={handleApprovalResponse}
            artifacts={(() => {
              const list = [...(currentWorkspace.artifacts || []), ...globalArtifacts];
              const seen = new Set<string>();
              return list.filter((art) => {
                if (!art || !art.path || seen.has(art.path)) return false;
                seen.add(art.path);
                return true;
              });
            })()}
            onOpenArtifact={handleOpenArtifact}
            onDeleteArtifact={handleDeleteArtifact}
            onClose={() => setIsAgentOpen(false)}
            theme={settings.theme}
          />
        )}
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

      <PerformanceModal
        isOpen={isPerfModalOpen}
        onClose={() => setIsPerfModalOpen(false)}
        theme={settings.theme}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onClearHistory={handleClearHistory}
        theme={settings.theme}
      />

      <ExtensionsModal
        isOpen={isExtensionsOpen}
        onClose={() => setIsExtensionsOpen(false)}
        theme={settings.theme}
      />
    </div>
  );
};

export default App;
