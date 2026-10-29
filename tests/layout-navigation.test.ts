import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';

describe('AdaL Nexus Browser Layout & Navigation Verification', () => {
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

  it('1. Initial layout renders TitleBar (y: 0-40), NavigationToolbar (y: 40-84), Sidebar (x: 0-72), and NewTabPage', async () => {
    const layout = await page.evaluate(() => {
      const titleBar = document.querySelector('div[style*="drag"]')?.getBoundingClientRect();
      const navToolbar = document.querySelector('button[title*="back"]')?.parentElement?.parentElement?.getBoundingClientRect();
      const sidebar = document.querySelector('aside')?.getBoundingClientRect();
      const main = document.querySelector('main')?.getBoundingClientRect();
      return { titleBar, navToolbar, sidebar, main };
    });

    expect(layout.titleBar?.top).toBe(0);
    expect(layout.titleBar?.height).toBe(40);
    expect(layout.navToolbar?.top).toBe(40);
    expect(layout.navToolbar?.height).toBe(44);
    expect(layout.sidebar?.left).toBe(0);
    expect(layout.sidebar?.width).toBe(72);
    expect(layout.main?.top).toBe(84);
    expect(layout.main?.left).toBe(72);
  });

  it('2. Navigating to Google Search positions WebContentsView strictly below y: 84 and x: 72', async () => {
    // Fill top omnibox with Google search
    const omnibox = page.locator('input[placeholder*="Search Google or type a URL"]').first();
    await omnibox.fill('https://www.google.com/search?q=adal+nexus');
    await omnibox.press('Enter');

    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url.includes('google.com/search');
    }, { timeout: 15000 });

    await page.waitForTimeout(600);

    // Verify main process WebContentsView bounds
    const viewBounds = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const cv = win.contentView;
      return cv.children.map(c => c.getBounds());
    });

    expect(viewBounds.length).toBeGreaterThan(0);
    for (const b of viewBounds) {
      if (b.width > 0 && b.height > 0) {
        expect(b.x).toBeGreaterThanOrEqual(72);
        expect(b.y).toBeGreaterThanOrEqual(84);
      }
    }

    // Verify title bar and navigation toolbar remain visible in DOM
    const titleBar = page.locator('text=AdaL Nexus').first();
    expect(await titleBar.isVisible()).toBe(true);

    const backBtn = page.locator('button[title*="back"]').first();
    expect(await backBtn.isVisible()).toBe(true);
  });

  it('3. Navigating to YouTube keeps WebContentsView strictly below y: 84 and x: 72', async () => {
    const omnibox = page.locator('input[placeholder*="Search Google or type a URL"]').first();
    await omnibox.fill('https://www.youtube.com');
    await omnibox.press('Enter');

    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url.includes('youtube.com');
    }, { timeout: 15000 });

    await page.waitForTimeout(600);

    const viewBounds = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.contentView.children.map(c => c.getBounds());
    });

    for (const b of viewBounds) {
      if (b.width > 0 && b.height > 0) {
        expect(b.x).toBeGreaterThanOrEqual(72);
        expect(b.y).toBeGreaterThanOrEqual(84);
      }
    }
  });

  it('4. Navigating to example.com and testing Back and Forward navigation', async () => {
    const omnibox = page.locator('input[placeholder*="Search Google or type a URL"]').first();
    await omnibox.fill('https://example.com');
    await omnibox.press('Enter');

    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url.includes('example.com');
    }, { timeout: 15000 });

    await page.waitForTimeout(600);

    // Click Back button
    const backBtn = page.locator('button[title*="back"]').first();
    await backBtn.click();
    await page.waitForTimeout(1000);

    let activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('youtube.com');

    // Click Forward button
    const fwdBtn = page.locator('button[title*="forward"]').first();
    await fwdBtn.click();
    await page.waitForTimeout(1000);

    activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('example.com');
  }, 35000);

  it('5. Reload button reloads the website', async () => {
    const reloadBtn = page.locator('button[title*="Reload"]').first();
    await reloadBtn.click();
    await page.waitForTimeout(800);

    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('example.com');
  }, 35000);

  it('6. Opening a New Tab hides website view and renders New Tab Page cleanly', async () => {
    const plusBtn = page.locator('button[title*="New tab"]').first();
    await plusBtn.click();
    await page.waitForTimeout(600);

    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.isNewTab).toBe(true);

    // Verify speed dials and search input visible on New Tab page
    const centerSearch = page.locator('input[placeholder*="Search Google or type a URL"]').nth(1);
    expect(await centerSearch.isVisible()).toBe(true);

    const ytSpeedDial = page.locator('button[title*="YouTube"]').first();
    expect(await ytSpeedDial.isVisible()).toBe(true);
  });

  it('7. Maximizing and unmaximizing window preserves strict y >= 84 and x >= 72 bounds', async () => {
    // Switch to first tab (example.com)
    const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    expect(tabs && tabs.length >= 2).toBe(true);

    await page.evaluate((id) => window.adalNexus?.switchTab(id), tabs![0].id);
    await page.waitForTimeout(600);

    // Maximize window
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.maximize();
    });
    await page.waitForTimeout(1000);

    let bounds = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        isMaximized: win.isMaximized(),
        childrenBounds: win.contentView.children.map(c => c.getBounds()),
      };
    });

    expect(bounds.isMaximized).toBe(true);
    for (const b of bounds.childrenBounds) {
      if (b.width > 0 && b.height > 0) {
        expect(b.x).toBeGreaterThanOrEqual(72);
        expect(b.y).toBeGreaterThanOrEqual(84);
      }
    }

    // Unmaximize window
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.unmaximize();
    });
    await page.waitForTimeout(1000);

    bounds = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        isMaximized: win.isMaximized(),
        childrenBounds: win.contentView.children.map(c => c.getBounds()),
      };
    });

    expect(bounds.isMaximized).toBe(false);
    for (const b of bounds.childrenBounds) {
      if (b.width > 0 && b.height > 0) {
        expect(b.x).toBeGreaterThanOrEqual(72);
        expect(b.y).toBeGreaterThanOrEqual(84);
      }
    }
  });
});
