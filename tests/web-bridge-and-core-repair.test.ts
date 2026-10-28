import { describe, it, expect, beforeEach } from 'vitest';
import { resolveUrlOrSearch } from '../src/shared/url-resolver';
import { initWebBridgeIfNeeded } from '../src/renderer/mock-bridge';

describe('AdaL Nexus Core Browser Repair & Web Bridge Verification', () => {
  beforeEach(() => {
    // Reset global window and localStorage mock
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };

    (global as any).localStorage = mockLocalStorage;
    (global as any).window = {
      localStorage: mockLocalStorage,
    };
  });

  describe('Requirement 1 & 2: Search & Navigation Resolution', () => {
    it('resolves plain text "mario game" to Google search results URL', () => {
      const resolved = resolveUrlOrSearch('mario game', 'google');
      expect(resolved).toBe('https://www.google.com/search?q=mario%20game');
    });

    it('preserves exact Google search URL "https://www.google.com/search?q=mario+game"', () => {
      const input = 'https://www.google.com/search?q=mario+game';
      const resolved = resolveUrlOrSearch(input, 'google');
      expect(resolved).toBe(input);
    });

    it('resolves domain "example.com" to "https://example.com"', () => {
      const resolved = resolveUrlOrSearch('example.com', 'google');
      expect(resolved).toBe('https://example.com');
    });

    it('navigates tab to Google search for "mario game" via Web Bridge', async () => {
      initWebBridgeIfNeeded();
      const api = (global as any).window.adalNexus;
      expect(api).toBeDefined();

      const tabs = await api.getTabs();
      expect(tabs.length).toBeGreaterThan(0);
      const activeId = tabs[0].id;

      // Navigate to "mario game"
      const success = await api.navigate(activeId, 'mario game');
      expect(success).toBe(true);

      const active = await api.getActiveTab();
      expect(active?.url).toBe('https://www.google.com/search?q=mario%20game');
      expect(active?.isNewTab).toBe(false);
      expect(active?.title).toContain('mario game');

      // Check history was recorded
      const history = await api.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].url).toBe('https://www.google.com/search?q=mario%20game');
    });

    it('navigates tab directly to exact Google URL via Web Bridge', async () => {
      initWebBridgeIfNeeded();
      const api = (global as any).window.adalNexus;

      const tabs = await api.getTabs();
      const activeId = tabs[0].id;

      const exactUrl = 'https://www.google.com/search?q=mario+game';
      await api.navigate(activeId, exactUrl);

      const active = await api.getActiveTab();
      expect(active?.url).toBe(exactUrl);
      expect(active?.isNewTab).toBe(false);
    });
  });

  describe('Requirement 3: Multi-Tab Creation, Switching & Closing', () => {
    it('creates multiple independent tabs with unique IDs', async () => {
      initWebBridgeIfNeeded();
      const api = (global as any).window.adalNexus;

      const initialTabs = await api.getTabs();
      expect(initialTabs.length).toBe(1);

      // Click "+" (createTab)
      const tab2 = await api.createTab('adal://newtab');
      expect(tab2.id).toBeDefined();
      expect(tab2.id).not.toBe(initialTabs[0].id);
      expect(tab2.isNewTab).toBe(true);

      // Create a 3rd tab with direct URL
      const tab3 = await api.createTab('https://example.com');
      expect(tab3.id).not.toBe(tab2.id);

      const allTabs = await api.getTabs();
      expect(allTabs.length).toBe(3);

      // Active tab should now be tab3
      const active = await api.getActiveTab();
      expect(active?.id).toBe(tab3.id);
    });

    it('switches between tabs cleanly', async () => {
      initWebBridgeIfNeeded();
      const api = (global as any).window.adalNexus;

      const tab1 = (await api.getTabs())[0];
      const tab2 = await api.createTab('adal://newtab');

      // Switch back to tab1
      await api.switchTab(tab1.id);
      const active = await api.getActiveTab();
      expect(active?.id).toBe(tab1.id);

      // Switch to tab2
      await api.switchTab(tab2.id);
      const active2 = await api.getActiveTab();
      expect(active2?.id).toBe(tab2.id);
    });

    it('closes tabs properly and manages active tab fallback', async () => {
      initWebBridgeIfNeeded();
      const api = (global as any).window.adalNexus;

      const tab1 = (await api.getTabs())[0];
      const tab2 = await api.createTab('adal://newtab');

      // Close tab2
      await api.closeTab(tab2.id);
      let tabs = await api.getTabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0].id).toBe(tab1.id);

      // Close last remaining tab: should automatically spawn a fresh New Tab
      await api.closeTab(tab1.id);
      tabs = await api.getTabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0].isNewTab).toBe(true);
    });
  });

  describe('Requirement 4: Theme Switching & Persistence', () => {
    it('switches from dark to light theme and persists in settings', async () => {
      initWebBridgeIfNeeded();
      const api = (global as any).window.adalNexus;

      let settings = await api.getBrowserSettings();
      expect(settings.theme).toBe('dark');

      let emittedSettings: any = null;
      api.onSettingsUpdated((s: any) => {
        emittedSettings = s;
      });

      // Switch to light theme
      const updated = await api.saveBrowserSettings({ theme: 'light' });
      expect(updated.theme).toBe('light');
      expect(emittedSettings?.theme).toBe('light');

      // Verify persisted in localStorage
      const reloaded = await api.getBrowserSettings();
      expect(reloaded.theme).toBe('light');

      // Switch back to dark theme
      const darkUpdated = await api.saveBrowserSettings({ theme: 'dark' });
      expect(darkUpdated.theme).toBe('dark');
    });
  });
});
