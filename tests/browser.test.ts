import { describe, it, expect, afterAll } from 'vitest';
import { PlaywrightBrowserService } from '../src/main/browser/browser-service';

describe('Real Playwright Browser Automation', () => {
  const browserService = new PlaywrightBrowserService({
    headless: true,
    viewportWidth: 1280,
    viewportHeight: 800,
  });

  afterAll(async () => {
    await browserService.close();
  });

  it('launches real Chromium, navigates to web page, and reads content', async () => {
    await browserService.initialize();

    // Navigate to example.com
    const navResult = await browserService.navigate('https://example.com');
    expect(navResult.status).toBe(200);
    expect(navResult.title).toContain('Example Domain');

    // Read page content
    const pageData = await browserService.readPageContent({ maxLength: 500 });
    expect(pageData.textContent.length).toBeGreaterThan(20);
    expect(pageData.title).toContain('Example Domain');
    expect(pageData.url).toContain('example.com');

    // Capture screenshot
    const screenshot = await browserService.getScreenshot();
    expect(screenshot.startsWith('data:image/png;base64,')).toBe(true);
    expect(screenshot.length).toBeGreaterThan(100);
  }, 40000);
});
