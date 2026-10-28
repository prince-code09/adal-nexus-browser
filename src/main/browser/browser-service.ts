import { chromium, Browser, BrowserContext, Page } from 'playwright';
import type { BrowserState } from '../../shared/types';

export interface BrowserServiceConfig {
  headless?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
}

export class PlaywrightBrowserService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserServiceConfig;
  private isControlledByAgent: boolean = true;
  private onStateChangeCallback?: (state: BrowserState) => void;

  constructor(config: BrowserServiceConfig = {}) {
    this.config = {
      headless: config.headless ?? false,
      viewportWidth: config.viewportWidth ?? 1280,
      viewportHeight: config.viewportHeight ?? 800,
    };
  }

  public onStateChange(cb: (state: BrowserState) => void): void {
    this.onStateChangeCallback = cb;
  }

  public async initialize(): Promise<void> {
    if (this.page) return;

    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      this.context = await this.browser.newContext({
        viewport: {
          width: this.config.viewportWidth || 1280,
          height: this.config.viewportHeight || 800,
        },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 AdaLNexus/1.0',
      });

      this.page = await this.context.newPage();

      // Listen for navigation events
      this.page.on('load', async () => {
        await this.broadcastCurrentState();
      });

      // Navigate to blank or initial landing
      await this.page.goto('about:blank');
      await this.broadcastCurrentState();
    } catch (err) {
      console.error('[BrowserService] Failed to launch Playwright Chromium:', err);
      throw err;
    }
  }

  public async broadcastCurrentState(): Promise<void> {
    if (!this.page || !this.onStateChangeCallback) return;

    try {
      const url = this.page.url();
      const title = await this.page.title().catch(() => 'Untitled');
      let screenshotBase64: string | null = null;

      try {
        const buffer = await this.page.screenshot({
          type: 'jpeg',
          quality: 50,
          scale: 'css',
        });
        screenshotBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      } catch {
        // Screenshot capture might fail if page is mid-navigation
      }

      this.onStateChangeCallback({
        url,
        title,
        isControlledByAgent: this.isControlledByAgent,
        screenshotBase64,
      });
    } catch (err) {
      // Ignore broadcast errors during transitions
    }
  }

  public async navigate(url: string, timeout = 30000): Promise<{ url: string; title: string; status: number }> {
    await this.ensurePage();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
      url = 'https://' + url;
    }

    const response = await this.page!.goto(url, {
      timeout,
      waitUntil: 'domcontentloaded',
    });

    const currentUrl = this.page!.url();
    const title = await this.page!.title();
    await this.broadcastCurrentState();

    return {
      url: currentUrl,
      title,
      status: response ? response.status() : 200,
    };
  }

  public async readPageContent(options?: {
    selector?: string;
    maxLength?: number;
  }): Promise<{ title: string; url: string; textContent: string; elementsFound: number }> {
    await this.ensurePage();
    const maxLength = options?.maxLength ?? 20000;
    const currentUrl = this.page!.url();
    const title = await this.page!.title();

    let rawText = '';
    let elementsFound = 0;

    if (options?.selector) {
      const elements = await this.page!.$$(options.selector);
      elementsFound = elements.length;
      const texts = await Promise.all(
        elements.slice(0, 20).map((el) => el.innerText().catch(() => ''))
      );
      rawText = texts.join('\n\n');
    } else {
      rawText = await this.page!.evaluate(() => {
        // Strip out script, style, svg, and iframe tags to avoid malicious code / noise
        const clone = document.body ? document.body.cloneNode(true) as HTMLElement : null;
        if (!clone) return document.title || '';
        const scripts = clone.querySelectorAll('script, style, noscript, svg');
        scripts.forEach((s: any) => s.remove());
        return clone.innerText || clone.textContent || '';
      });
      elementsFound = 1;
    }

    // Sanitize and truncate
    const sanitized = rawText.replace(/\s+/g, ' ').trim().slice(0, maxLength);

    return {
      title,
      url: currentUrl,
      textContent: sanitized,
      elementsFound,
    };
  }

  public async click(selector: string, timeout = 10000): Promise<boolean> {
    await this.ensurePage();
    await this.page!.waitForSelector(selector, { timeout, state: 'visible' });
    await this.page!.click(selector);
    await this.broadcastCurrentState();
    return true;
  }

  public async fill(selector: string, text: string, timeout = 10000): Promise<boolean> {
    await this.ensurePage();
    await this.page!.waitForSelector(selector, { timeout, state: 'visible' });
    await this.page!.fill(selector, text);
    await this.broadcastCurrentState();
    return true;
  }

  public async extractStructuredData<T>(extractorScript: string): Promise<T> {
    await this.ensurePage();
    return await this.page!.evaluate(extractorScript) as T;
  }

  public async getScreenshot(): Promise<string> {
    await this.ensurePage();
    const buffer = await this.page!.screenshot({ type: 'png' });
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  public setTakeover(takeover: boolean): void {
    this.isControlledByAgent = !takeover;
    this.broadcastCurrentState();
  }

  public getIsControlledByAgent(): boolean {
    return this.isControlledByAgent;
  }

  public getPage(): Page | null {
    return this.page;
  }

  public async reload(): Promise<void> {
    if (this.page) {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.broadcastCurrentState();
    }
  }

  private async ensurePage(): Promise<void> {
    if (!this.page || this.page.isClosed()) {
      await this.initialize();
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.context) await this.context.close().catch(() => {});
      if (this.browser) await this.browser.close().catch(() => {});
    } finally {
      this.page = null;
      this.context = null;
      this.browser = null;
    }
  }
}
