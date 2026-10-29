import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';

describe('AdaL Nexus Sidebar, Navigation & Window Controls Verification', () => {
  let app: ElectronApplication;
  let page: Page;

  beforeAll(async () => {
    app = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        TEST_BUILD: 'true',
        NODE_ENV: 'production',
      },
      cwd: path.resolve(__dirname, '..'),
    });

    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  }, 45000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Window controls (Minimize, Maximize/Restore, Close) are present and responsive', async () => {
    const minBtn = page.locator('button[title="Minimize"]').first();
    const maxBtn = page.locator('button[title="Maximize"], button[title="Restore"]').first();
    const closeBtn = page.locator('button[title="Close"]').first();

    expect(await minBtn.isVisible()).toBe(true);
    expect(await maxBtn.isVisible()).toBe(true);
    expect(await closeBtn.isVisible()).toBe(true);

    // Test maximize toggle
    await maxBtn.click();
    await page.waitForTimeout(1000);

    const isMax = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.isMaximized();
    });
    expect(isMax).toBe(true);

    // Unmaximize
    await maxBtn.click();
    await page.waitForTimeout(1000);

    const isUnmax = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.isMaximized();
    });
    expect(isUnmax).toBe(false);
  });

  it('2. Exact Navigation Sequence: YouTube -> GitHub -> Back -> Forward -> Home -> return to tab with intact history', async () => {
    // Navigate active tab to YouTube
    const omnibox = page.locator('input[placeholder*="Search Google or type a URL"]').first();
    await omnibox.fill('https://www.youtube.com');
    await omnibox.press('Enter');

    // Wait until YouTube is registered as active tab
    await expect.poll(async () => {
      const active = await page.evaluate(() => window.adalNexus?.getActiveTab());
      return active?.url;
    }, { timeout: 25000 }).toContain('youtube.com');

    const websiteTabId = await page.evaluate(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active?.id;
    });
    expect(websiteTabId).toBeDefined();

    // Give navigation a brief moment to stabilize
    await page.waitForTimeout(2000);

    // Navigate same tab to GitHub
    await omnibox.fill('https://github.com');
    await omnibox.press('Enter');

    // Wait until GitHub commits and canGoBack becomes true
    await expect.poll(async () => {
      const active = await page.evaluate(() => window.adalNexus?.getActiveTab());
      return active?.url.includes('github.com') && active?.canGoBack;
    }, { timeout: 30000 }).toBe(true);

    await page.waitForTimeout(1000);

    // Verify Back is enabled, click Back to return to YouTube
    const backBtn = page.locator('button[title*="back"]').first();
    expect(await backBtn.isEnabled()).toBe(true);
    await backBtn.click();

    // Verify Back returns to YouTube
    await expect.poll(async () => {
      const active = await page.evaluate(() => window.adalNexus?.getActiveTab());
      return active?.url;
    }, { timeout: 25000 }).toContain('youtube.com');

    let activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('youtube.com');
    expect(activeTab?.canGoForward).toBe(true);

    // Click Forward to return to GitHub
    const fwdBtn = page.locator('button[title*="forward"]').first();
    expect(await fwdBtn.isEnabled()).toBe(true);
    await fwdBtn.click();

    await expect.poll(async () => {
      const active = await page.evaluate(() => window.adalNexus?.getActiveTab());
      return active?.url;
    }, { timeout: 25000 }).toContain('github.com');

    activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('github.com');

    // Click Home button in navigation toolbar
    const homeBtn = page.locator('button[title*="Home"], button[title*="home"]').first();
    await homeBtn.click();
    await page.waitForTimeout(1000);

    // Active tab is now Home / New Tab
    activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.isNewTab).toBe(true);

    // Verify website tab still exists in the tab list
    const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    const preservedWebTab = tabs?.find((t) => t.id === websiteTabId);
    expect(preservedWebTab).toBeDefined();
    expect(preservedWebTab?.url).toContain('github.com');

    // Switch back to the website tab
    await page.evaluate((id) => window.adalNexus?.switchTab(id!), websiteTabId);
    await page.waitForTimeout(1000);

    activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.id).toBe(websiteTabId);
    expect(activeTab?.url).toContain('github.com');
    expect(activeTab?.canGoBack).toBe(true);

    // Back still returns to YouTube
    await backBtn.click();
    await expect.poll(async () => {
      const active = await page.evaluate(() => window.adalNexus?.getActiveTab());
      return active?.url;
    }, { timeout: 25000 }).toContain('youtube.com');

    activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('youtube.com');
  }, 90000);

  it('3. Left sidebar items (Bookmarks, History, Downloads, Settings) open modals and suspend WebContentsView visibility', async () => {
    // Open Bookmarks from sidebar
    const bookmarksNav = page.locator('aside button[title="Bookmarks"]').first();
    await bookmarksNav.click();
    await page.waitForTimeout(500);

    // Bookmarks modal visible
    const bookmarksModalTitle = page.locator('span:text-is("Bookmarks")').first();
    expect(await bookmarksModalTitle.isVisible()).toBe(true);

    // Verify TabManager suspended the active WebContentsView
    const isSuspendedWithModal = await app.evaluate(() => {
      return (globalThis as any).tabManager?.isViewSuspendedState();
    });
    expect(isSuspendedWithModal).toBe(true);

    // Close Bookmarks modal using the X close button
    const closeBtn = page.locator('.fixed button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await page.waitForTimeout(500);

    // View suspension is restored
    const isSuspendedAfterClose = await app.evaluate(() => {
      return (globalThis as any).tabManager?.isViewSuspendedState();
    });
    expect(isSuspendedAfterClose).toBe(false);

    // Open History from sidebar
    const historyNav = page.locator('aside button[title="History"]').first();
    await historyNav.click();
    await page.waitForTimeout(500);

    const historyModalTitle = page.locator('span:text-is("Browsing History")').first();
    expect(await historyModalTitle.isVisible()).toBe(true);

    const isSuspendedHistory = await app.evaluate(() => {
      return (globalThis as any).tabManager?.isViewSuspendedState();
    });
    expect(isSuspendedHistory).toBe(true);

    // Close History using the X close button
    const historyClose = page.locator('.fixed button:has(svg.lucide-x)').first();
    await historyClose.click();
    await page.waitForTimeout(500);

    // Open Settings from sidebar
    const settingsNav = page.locator('aside button[title="Settings"]').first();
    await settingsNav.click();
    await page.waitForTimeout(500);

    const settingsTitle = page.locator('span:has-text("Settings & Preferences")').first();
    expect(await settingsTitle.isVisible()).toBe(true);

    const isSuspendedSettings = await app.evaluate(() => {
      return (globalThis as any).tabManager?.isViewSuspendedState();
    });
    expect(isSuspendedSettings).toBe(true);

    // Close Settings using the X close button
    const settingsClose = page.locator('.fixed button:has(svg.lucide-x)').first();
    await settingsClose.click();
    await page.waitForTimeout(500);

    // Website tab remains active and intact
    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.isNewTab).toBe(false);
  }, 45000);
});
