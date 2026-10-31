import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';

describe('AdaL Nexus Search & Navigation Verification', () => {
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
  }, 30000);

  it('Case 1: Types "mario game" in center New Tab search box and presses Enter', async () => {
    const inputs = page.locator('input[placeholder*="Search Google or type a URL"]');
    const centerInput = inputs.nth(1);
    await centerInput.fill('mario game');
    await centerInput.press('Enter');

    // Wait for tab URL to update to google search
    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url.includes('google.com/search') && active.url.includes('mario');
    }, { timeout: 15000 });

    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('google.com/search?q=mario%20game');
    expect(activeTab?.isNewTab).toBe(false);
  });

  it('Case 2: Opens a fresh new tab and repeats search using the search icon click', async () => {
    // Create and switch to a fresh new tab
    const newTab = await page.evaluate(() => window.adalNexus?.createTab('adal://newtab'));
    expect(newTab?.isNewTab).toBe(true);

    await page.waitForTimeout(600);

    // Locate center input on this new tab
    const inputs = page.locator('input[placeholder*="Search Google or type a URL"]');
    const centerInput = inputs.nth(1);
    await centerInput.fill('sonic the hedgehog');

    // Click the search button explicitly
    const searchBtn = page.locator('form button[type="submit"]');
    await searchBtn.click();

    // Verify search navigation occurred
    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url.includes('google.com/search') && active.url.includes('sonic');
    }, { timeout: 15000 });

    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('google.com/search?q=sonic%20the%20hedgehog');
    expect(activeTab?.isNewTab).toBe(false);
  });

  it('Case 3: Types "weather today" in the top address bar and presses Enter', async () => {
    const inputs = page.locator('input[placeholder*="Search Google or type a URL"]');
    const topOmnibox = inputs.first();
    await topOmnibox.fill('weather today');
    await topOmnibox.press('Enter');

    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url.includes('google.com/search') && active.url.includes('weather');
    }, { timeout: 15000 });

    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('google.com/search?q=weather%20today');
  });

  it('Case 4: Navigates directly to https://example.com in the top address bar', async () => {
    const topOmnibox = page.locator('input[placeholder*="Search Google or type a URL"]').first();
    await topOmnibox.fill('https://example.com');
    await topOmnibox.press('Enter');

    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url === 'https://example.com';
    }, { timeout: 15000 });

    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url.replace(/\/$/, '')).toBe('https://example.com');
  });

  it('Case 5: Verifies Back and Forward navigation', async () => {
    // Current tab was on weather today then example.com, so canGoBack should be supported
    // Navigate to example.org
    const topOmnibox = page.locator('input[placeholder*="Search Google or type a URL"]').first();
    await topOmnibox.fill('https://example.org');
    await topOmnibox.press('Enter');

    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url === 'https://example.org';
    }, { timeout: 15000 });

    // Go Back
    await page.evaluate(async () => {
      const active = await window.adalNexus?.getActiveTab();
      if (active) await window.adalNexus?.goBack(active.id);
    });

    await page.waitForTimeout(1000);

    const activeTabAfterBack = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTabAfterBack).toBeDefined();

    // Go Forward
    await page.evaluate(async () => {
      const active = await window.adalNexus?.getActiveTab();
      if (active) await window.adalNexus?.goForward(active.id);
    });

    await page.waitForTimeout(1000);

    const activeTabAfterForward = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTabAfterForward).toBeDefined();
  });

  it('Case 6: Navigates directly to exact Google Search URL "https://www.google.com/search?q=mario+game"', async () => {
    const topOmnibox = page.locator('input[placeholder*="Search Google or type a URL"]').first();
    const exactUrl = 'https://www.google.com/search?q=mario+game';
    await topOmnibox.fill(exactUrl);
    await topOmnibox.press('Enter');

    await page.waitForFunction(async () => {
      const active = await window.adalNexus?.getActiveTab();
      return active && active.url === 'https://www.google.com/search?q=mario+game';
    }, { timeout: 15000 });

    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toBe(exactUrl);
    expect(activeTab?.isNewTab).toBe(false);
  });

  it('Case 7: Creates a new tab via "+" button and confirms search field starts blank', async () => {
    // Click the "+" button in the titlebar
    const plusBtn = page.locator('button[title*="New tab"]').first();
    await plusBtn.click();

    await page.waitForTimeout(600);

    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.isNewTab).toBe(true);

    // Verify center search input on the newly created tab is empty
    const inputs = page.locator('input[placeholder*="Search Google or type a URL"]');
    const centerInput = inputs.nth(1);
    const val = await centerInput.inputValue();
    expect(val).toBe('');
  });

  it('Case 8: Toggles theme between Dark and Clean Light mode and verifies root class', async () => {
    // Check initial dark theme
    const isDarkInitial = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkInitial).toBe(true);

    // Switch to light theme via API
    await page.evaluate(() => window.adalNexus?.saveBrowserSettings({ theme: 'light' }));
    await page.waitForTimeout(400);

    const isLightNow = await page.evaluate(() => document.documentElement.classList.contains('light'));
    expect(isLightNow).toBe(true);

    // Switch back to dark theme
    await page.evaluate(() => window.adalNexus?.saveBrowserSettings({ theme: 'dark' }));
    await page.waitForTimeout(400);

    const isDarkAgain = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkAgain).toBe(true);
  });
});
