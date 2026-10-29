import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';

describe('AdaL Nexus: Blank Page & Tab Creation Verification', () => {
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
    await page.waitForTimeout(1500);
  }, 45000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Tab creation from React + button works, creates 3 unique tabs displaying New Tab / Home', async () => {
    // Initial tab should be New Tab
    const initialTabs = await page.evaluate(() => window.adalNexus?.getTabs());
    expect(initialTabs?.length).toBeGreaterThanOrEqual(1);
    expect(initialTabs?.[0].url).toBe('adal://newtab');
    expect(initialTabs?.[0].isNewTab).toBe(true);

    // Verify NewTabPage is visible in the React DOM
    const searchInputs = page.locator('input[placeholder*="Search Google or type a URL"]');
    expect(await searchInputs.count()).toBeGreaterThan(0);
    expect(await searchInputs.last().isVisible()).toBe(true);

    // Verify win.contentView has 0 child views attached on New Tab
    const childCountInitial = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.contentView.children.length;
    });
    expect(childCountInitial).toBe(0);

    // Click + button to create Tab 2
    const newTabBtn = page.locator('button[title*="New tab" i]').first();
    await newTabBtn.click();
    await page.waitForTimeout(800);

    // Click + button to create Tab 3
    await newTabBtn.click();
    await page.waitForTimeout(800);

    const tabsAfter = await page.evaluate(() => window.adalNexus?.getTabs());
    expect(tabsAfter?.length).toBe(3);

    // Verify all 3 tabs have unique IDs
    const ids = tabsAfter?.map((t) => t.id) || [];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);

    // Tab 3 is active and on New Tab
    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.id).toBe(tabsAfter?.[2].id);
    expect(activeTab?.isNewTab).toBe(true);
    expect(await searchInputs.last().isVisible()).toBe(true);

    // Child views in contentView should still be 0 (no blocking native view)
    const childCountTabs = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.contentView.children.length;
    });
    expect(childCountTabs).toBe(0);
  }, 20000);

  it('2. Navigating Tab 2 to https://example.com loads content below toolbar and sidebar without blanking', async () => {
    // Switch to Tab 2
    const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    const tab2Id = tabs?.[1].id;
    expect(tab2Id).toBeDefined();

    await page.evaluate((id) => window.adalNexus?.switchTab(id!), tab2Id);
    await page.waitForTimeout(500);

    // Navigate Tab 2 to https://example.com
    await page.evaluate(({ id }) => window.adalNexus?.navigate(id, 'https://example.com'), { id: tab2Id! });

    // Poll until webContents loads example.com
    await expect.poll(async () => {
      return await app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const activeChild = win.contentView.children[0] as any;
        return activeChild?.webContents?.getURL();
      });
    }, { timeout: 25000, intervals: [400, 600] }).toContain('example.com');

    // Check main process: exactly 1 child view attached with correct non-zero bounds
    const viewStatus = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const children = win.contentView.children;
      if (children.length !== 1) return { count: children.length };
      const bounds = children[0].getBounds();
      return { count: children.length, bounds };
    });

    expect(viewStatus.count).toBe(1);
    expect(viewStatus.bounds?.x).toBeGreaterThanOrEqual(72); // Below sidebar
    expect(viewStatus.bounds?.y).toBeGreaterThanOrEqual(84); // Below header toolbar
    expect(viewStatus.bounds?.width).toBeGreaterThan(400);
    expect(viewStatus.bounds?.height).toBeGreaterThan(300);

    // Verify Tab 2 webContents title contains Example Domain
    await expect.poll(async () => {
      return await app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const activeChild = win.contentView.children[0] as any;
        return activeChild?.webContents?.getTitle();
      });
    }, { timeout: 10000, intervals: [300] }).toContain('Example Domain');
  }, 30000);

  it('3. Navigating Tab 3 to https://www.youtube.com renders correctly and does not stay blank', async () => {
    // Switch to Tab 3
    const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    const tab3Id = tabs?.[2].id;
    expect(tab3Id).toBeDefined();

    await page.evaluate((id) => window.adalNexus?.switchTab(id!), tab3Id);
    await page.waitForTimeout(500);

    // Navigate Tab 3 to https://www.youtube.com
    await page.evaluate(({ id }) => window.adalNexus?.navigate(id, 'https://www.youtube.com'), { id: tab3Id! });

    // Wait for YouTube content to load in webContents
    await expect.poll(async () => {
      return await app.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        const activeChild = win.contentView.children[0] as any;
        return activeChild?.webContents?.getURL();
      });
    }, { timeout: 30000, intervals: [500] }).toContain('youtube.com');

    // In main process: still exactly 1 child view attached (Tab 2 view was detached!)
    const viewStatus = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const children = win.contentView.children;
      return {
        count: children.length,
        bounds: children[0]?.getBounds(),
      };
    });

    expect(viewStatus.count).toBe(1);
    expect(viewStatus.bounds?.x).toBeGreaterThanOrEqual(72);
    expect(viewStatus.bounds?.y).toBeGreaterThanOrEqual(84);
  }, 35000);

  it('4. Switching between Tab 1 (New Tab), Tab 2 (example.com), and Tab 3 (youtube.com) displays correct content without blanking', async () => {
    const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    const [t1, t2, t3] = tabs || [];

    // Switch to Tab 1 (New Tab)
    await page.evaluate((id) => window.adalNexus?.switchTab(id), t1.id);
    await page.waitForTimeout(400);

    const searchInputs = page.locator('input[placeholder*="Search Google or type a URL"]');
    expect(await searchInputs.last().isVisible()).toBe(true);

    const t1Children = await app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].contentView.children.length;
    });
    expect(t1Children).toBe(0); // 0 child views, NewTabPage visible

    // Switch to Tab 2 (example.com)
    await page.evaluate((id) => window.adalNexus?.switchTab(id), t2.id);
    await page.waitForTimeout(400);

    const t2Details = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const child = win.contentView.children[0] as any;
      return {
        childrenCount: win.contentView.children.length,
        url: child?.webContents.getURL(),
        title: child?.webContents.getTitle(),
      };
    });
    expect(t2Details.childrenCount).toBe(1);
    expect(t2Details.url).toContain('example.com');
    expect(t2Details.title).toContain('Example Domain');

    // Switch to Tab 3 (youtube.com)
    await page.evaluate((id) => window.adalNexus?.switchTab(id), t3.id);
    await page.waitForTimeout(400);

    const t3Details = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const child = win.contentView.children[0] as any;
      return {
        childrenCount: win.contentView.children.length,
        url: child?.webContents.getURL(),
      };
    });
    expect(t3Details.childrenCount).toBe(1);
    expect(t3Details.url).toContain('youtube.com');
  }, 20000);

  it('5. Back, Forward, and Home navigation work reliably across tab states', async () => {
    const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    const t2 = tabs?.[1];

    // Select Tab 2 (which is at https://example.com)
    await page.evaluate((id) => window.adalNexus?.switchTab(id!), t2?.id);
    await page.waitForTimeout(500);

    // Navigate Tab 2 to https://iana.org
    await page.evaluate(({ id }) => window.adalNexus?.navigate(id, 'https://iana.org'), { id: t2!.id });

    // Wait until iana.org loads and canGoBack is true
    await expect.poll(async () => {
      const active = await page.evaluate(() => window.adalNexus?.getActiveTab());
      return active?.url.includes('iana.org') && active?.canGoBack;
    }, { timeout: 30000, intervals: [400] }).toBe(true);

    // Click Back
    const backBtn = page.locator('button[title*="back" i]').first();
    expect(await backBtn.isEnabled()).toBe(true);
    await backBtn.click();

    // Verify Back returns to example.com
    await expect.poll(async () => {
      const active = await page.evaluate(() => window.adalNexus?.getActiveTab());
      return active?.url;
    }, { timeout: 25000, intervals: [400] }).toContain('example.com');

    // Click Forward
    const forwardBtn = page.locator('button[title*="forward" i]').first();
    expect(await forwardBtn.isEnabled()).toBe(true);
    await forwardBtn.click();

    await expect.poll(async () => {
      const active = await page.evaluate(() => window.adalNexus?.getActiveTab());
      return active?.url;
    }, { timeout: 25000, intervals: [400] }).toContain('iana.org');

    // Click Home button -> should take user to New Tab / Home
    const homeBtn = page.locator('button[title*="home" i]').first();
    await homeBtn.click();
    await page.waitForTimeout(800);

    const activeAfterHome = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeAfterHome?.isNewTab).toBe(true);

    const searchInputs = page.locator('input[placeholder*="Search Google or type a URL"]');
    expect(await searchInputs.last().isVisible()).toBe(true);
  }, 40000);
});
