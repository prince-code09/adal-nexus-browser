import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';

describe('AdaL Nexus Real Desktop Browser E2E Tests', () => {
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
    // Give a brief moment for React state and initial tab creation to stabilize
    await page.waitForTimeout(1000);
  }, 45000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Launches in its own desktop window with custom title bar & brand', async () => {
    expect(page).toBeDefined();

    const brandText = await page.locator('text=AdaL Nexus').first().textContent();
    expect(brandText).toContain('AdaL Nexus');

    const titleBar = page.locator('div:has-text("AdaL Nexus")').first();
    expect(await titleBar.isVisible()).toBe(true);
  });

  it('2. Renders initial New Tab with speed dials and bottom cards', async () => {
    const searchInput = page.locator('input[placeholder*="Search Google or type a URL"]').first();
    expect(await searchInput.isVisible()).toBe(true);

    expect(await page.locator('text=YouTube').first().isVisible()).toBe(true);
    expect(await page.locator('text=Google').first().isVisible()).toBe(true);
    expect(await page.locator('text=GitHub').first().isVisible()).toBe(true);
    expect(await page.locator('text=ChatGPT').first().isVisible()).toBe(true);

    expect(await page.locator('text=Fast').first().isVisible()).toBe(true);
    expect(await page.locator('text=Secure').first().isVisible()).toBe(true);
    expect(await page.locator('text=Smart').first().isVisible()).toBe(true);
    expect(await page.locator('text=Customizable').first().isVisible()).toBe(true);
  });

  it('3. Navigates to real external website (example.com)', async () => {
    await page.evaluate(async () => {
      const tabs = await window.adalNexus?.getTabs();
      if (tabs && tabs.length > 0) {
        await window.adalNexus?.navigate(tabs[0].id, 'https://example.com');
      }
    });

    await page.waitForFunction(async () => {
      const tabs = await window.adalNexus?.getTabs();
      return tabs && tabs.length > 0 && tabs[0].url.includes('example.com');
    }, { timeout: 15000 });

    const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    expect(tabs?.[0].url).toBe('https://example.com');
  });

  it('4. Converts search query "weather today" to Google search URL', async () => {
    await page.evaluate(async () => {
      const tabs = await window.adalNexus?.getTabs();
      if (tabs && tabs.length > 0) {
        await window.adalNexus?.navigate(tabs[0].id, 'weather today');
      }
    });

    await page.waitForFunction(async () => {
      const tabs = await window.adalNexus?.getTabs();
      return tabs && tabs[0].url.includes('google.com/search') && tabs[0].url.includes('weather');
    }, { timeout: 15000 });

    const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    expect(tabs?.[0].url).toContain('google.com/search?q=weather%20today');
  });

  it('5. Creates multiple independent tabs and switches between them', async () => {
    await page.evaluate(() => window.adalNexus?.createTab('https://example.com'));
    await page.evaluate(() => window.adalNexus?.createTab('adal://newtab'));

    let tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    expect(tabs?.length).toBe(3);

    const tab2Id = tabs![1].id;
    await page.evaluate((id) => window.adalNexus?.switchTab(id), tab2Id);

    let currentTabs = await page.evaluate(() => window.adalNexus?.getTabs());
    expect(currentTabs?.length).toBe(3);
  });

  it('6. Closes a tab and preserves remaining tabs', async () => {
    let tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    const countBefore = tabs?.length || 0;
    const tabToClose = tabs![tabs!.length - 1].id;

    await page.evaluate((id) => window.adalNexus?.closeTab(id), tabToClose);

    tabs = await page.evaluate(() => window.adalNexus?.getTabs());
    expect(tabs?.length).toBe(countBefore - 1);
  });

  it('7. Bookmarks a page and confirms bookmark retrieval', async () => {
    const bm = await page.evaluate(() =>
      window.adalNexus?.addBookmark({
        title: 'Vitest Automated Bookmark',
        url: 'https://example.com/test-bm',
      })
    );
    expect(bm?.id).toBeDefined();

    const isBm = await page.evaluate(() =>
      window.adalNexus?.isBookmarked('https://example.com/test-bm')
    );
    expect(isBm).toBe(true);

    const allBms = await page.evaluate(() => window.adalNexus?.getBookmarks());
    expect(allBms?.some((b) => b.url === 'https://example.com/test-bm')).toBe(true);
  });

  it('8. Verifies browsing history recorded the navigation', async () => {
    const history = await page.evaluate(() => window.adalNexus?.getHistory());
    expect(history && history.length > 0).toBe(true);
    expect(history?.some((h) => h.url.includes('example.com'))).toBe(true);
  });

  it('9. Verifies security configuration: contextIsolation and sandbox enabled', async () => {
    const hasRequire = await page.evaluate(() => typeof (window as any).require !== 'undefined');
    const hasProcess = await page.evaluate(() => typeof (window as any).process !== 'undefined' && typeof (window as any).process.versions?.node !== 'undefined');

    expect(hasRequire).toBe(false);
    expect(hasProcess).toBe(false);
  });
});
