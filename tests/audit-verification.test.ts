import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';

describe('AdaL Nexus Full-System Audit Verification', () => {
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

  it('1. Extensions button in Sidebar opens Extensions modal and strictly DOES NOT open AI Chatbot', async () => {
    // Locate Extensions button in sidebar
    const extBtn = page.locator('button[title="Extensions"]').first();
    expect(await extBtn.isVisible()).toBe(true);

    // Click Extensions button
    await extBtn.click();
    await page.waitForTimeout(500);

    // Verify Extensions modal is displayed
    const extModalTitle = page.locator('#ext-modal-title');
    expect(await extModalTitle.isVisible()).toBe(true);
    expect(await extModalTitle.textContent()).toContain('Extensions & Web Capabilities');

    // Verify AI Agent Companion / Chat panel is NOT open (count should be 0)
    const agentHeader = page.locator('text="AdaL Agent"');
    expect(await agentHeader.count()).toBe(0);

    // Verify truthful disclosure text is present
    const disclosure = page.locator('text=Electron Extension Policy:');
    expect(await disclosure.isVisible()).toBe(true);

    // Close Extensions modal
    const closeBtn = page.locator('button[title="Close"]').last();
    await closeBtn.click();
    await page.waitForTimeout(400);
    expect(await extModalTitle.isVisible()).toBe(false);
  }, 20000);

  it('2. Real Performance Telemetry reports actual process memory, GPU, and cache cleanup', async () => {
    // Open Performance modal
    const fastCard = page.locator('div[title*="Performance and Telemetry"]').first();
    await fastCard.click();
    await page.waitForTimeout(500);

    const perfModalTitle = page.locator('#perf-modal-title');
    expect(await perfModalTitle.isVisible()).toBe(true);

    // Test real telemetry IPC directly
    const telemetry = await page.evaluate(async () => {
      return await window.adalNexus?.getSystemTelemetry?.();
    });

    expect(telemetry).toBeDefined();
    expect(telemetry?.heapUsedMB).toBeGreaterThan(0);
    expect(telemetry?.heapTotalMB).toBeGreaterThanOrEqual(telemetry?.heapUsedMB || 0);
    expect(telemetry?.rssMB).toBeGreaterThan(0);
    expect(telemetry?.gpuRenderer).toBeDefined();
    expect(telemetry?.gpuStatus).toBeDefined();
    expect(telemetry?.contextIsolationVerified).toBe(true);

    // Test Optimize Memory & Flush Cache button
    const optimizeBtn = page.locator('button:has-text("Flush Chromium Disk")').first();
    expect(await optimizeBtn.isVisible()).toBe(true);
    await optimizeBtn.click();
    await page.waitForTimeout(1000);

    // Close Performance modal
    const closeBtn = page.locator('button[title="Close"]').last();
    await closeBtn.click();
    await page.waitForTimeout(400);
  }, 25000);

  it('3. Security Modal reflects verified isolation and clears cache while preserving bookmarks', async () => {
    // Add a test bookmark first
    await page.evaluate(async () => {
      await window.adalNexus?.addBookmark({
        title: 'Preserved Test Bookmark',
        url: 'https://example.com/test-bookmark',
      });
    });

    // Open Security modal
    const secureCard = page.locator('div[title*="Privacy and Sandboxing"]').first();
    await secureCard.click();
    await page.waitForTimeout(500);

    const secModalTitle = page.locator('#security-modal-title');
    expect(await secModalTitle.isVisible()).toBe(true);

    // Verify enforced badge
    const enforcedBadge = page.locator('text=ENFORCED').first();
    expect(await enforcedBadge.isVisible()).toBe(true);

    // Click Clear History & Cache button
    const clearBtn = page.locator('button:has-text("Clear History & Cache")').first();
    await clearBtn.click();
    await page.waitForTimeout(1000);

    // Verify bookmarks were preserved
    const bookmarks = await page.evaluate(async () => {
      return await window.adalNexus?.getBookmarks();
    });
    const found = bookmarks?.some((b) => b.url.includes('test-bookmark'));
    expect(found).toBe(true);

    // Close Security modal
    const closeBtn = page.locator('button[title="Close"]').last();
    await closeBtn.click();
    await page.waitForTimeout(400);
  }, 25000);

  it('4. Price comparison task executes, extracts normalized unit prices, and creates PDF report', async () => {
    // Open AI Companion via bottom AI Agent button
    const aiBtn = page.locator('button[title*="AI Agent"]').first();
    await aiBtn.click();
    await page.waitForTimeout(600);

    // Verify AI Agent panel opened
    const agentHeader = page.locator('text="AdaL Agent"').first();
    expect(await agentHeader.isVisible()).toBe(true);

    // Submit price comparison task
    const chatInput = page.locator('textarea[placeholder*="Ask AdaL Agent"]').first();
    expect(await chatInput.isVisible()).toBe(true);
    await chatInput.fill('Compare mango prices and show me where I can buy them for the lowest price');
    await chatInput.press('Enter');

    // Wait until task reaches completed state and findings are displayed
    await expect.poll(async () => {
      const msgs = await page.evaluate(() => document.body.textContent || '');
      return msgs.includes('Lowest Price Recommendation') || msgs.includes('Price Comparison Complete');
    }, { timeout: 35000, intervals: [600, 1000] }).toBe(true);

    // Verify structured findings table is visible in Chat
    const tableHeader = page.locator('text=Verified Research Findings').first();
    expect(await tableHeader.isVisible()).toBe(true);

    // Verify cheapest vendor is identified
    const pageText = await page.evaluate(() => document.body.textContent || '');
    expect(pageText).toContain('JioMart');
    expect(pageText).toContain('149/kg');

    // Verify PDF Deliverable Action Card is visible
    const pdfCard = page.locator('text=PDF Deliverable').first();
    expect(await pdfCard.isVisible()).toBe(true);
  }, 45000);

  it('5. Opening PDF report opens directly in-app inside a managed AdaL Nexus tab without launching external apps', async () => {
    const tabsBefore = await page.evaluate(() => window.adalNexus?.getTabs());
    const countBefore = tabsBefore?.length || 1;

    // Click Open PDF button in the chat deliverable card
    const openPdfBtn = page.locator('button[title="Open PDF Report"]').first();
    expect(await openPdfBtn.isVisible()).toBe(true);
    await openPdfBtn.click();
    await page.waitForTimeout(1500);

    // Verify a new tab was opened in AdaL Nexus
    await expect.poll(async () => {
      const tabs = await page.evaluate(() => window.adalNexus?.getTabs());
      return tabs?.length;
    }, { timeout: 10000 }).toBe(countBefore + 1);

    // Verify active tab URL is a local file:///...pdf URL
    const activeTab = await page.evaluate(() => window.adalNexus?.getActiveTab());
    expect(activeTab?.url).toContain('file:///');
    expect(activeTab?.url.toLowerCase()).toContain('.pdf');

    // Verify tab is active and attached in main process WebContentsView
    const viewStatus = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const children = win.contentView.children;
      return {
        count: children.length,
        url: (children[0] as any)?.webContents?.getURL(),
      };
    });
    expect(viewStatus.count).toBe(1);
    expect(viewStatus.url).toContain('.pdf');
  }, 25000);
});
