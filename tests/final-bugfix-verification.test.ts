import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ToolRegistry } from '../src/main/agent/tools/registry';
import { ExecutionEngine } from '../src/main/agent/execution-engine';
import { TaskPlanner } from '../src/main/agent/planner';
import { MockLocalAIAdapter } from '../src/main/agent/adapters/mock-adapter';
import { ArtifactService } from '../src/main/services/artifact-service';
import { TabManager } from '../src/main/browser/tab-manager';
import { BrowserStore } from '../src/main/storage/browser-store';
import { WallpaperService, LOCAL_WALLPAPER_CATALOG } from '../src/main/services/wallpaper-service';
import { resolveUrlOrSearch } from '../src/shared/url-resolver';

describe('AdaL Nexus — Final Bug Fixes & System Verification Suite', () => {
  let tempDir: string;
  let artifactService: ArtifactService;
  let store: BrowserStore;
  let tabManager: TabManager;
  let toolRegistry: ToolRegistry;
  let planner: TaskPlanner;
  let engine: ExecutionEngine;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adal-final-test-'));
    artifactService = new ArtifactService(path.join(tempDir, 'artifacts'));
    store = new BrowserStore(path.join(tempDir, 'store.json'));
    tabManager = new TabManager(store, () => null);

    const settings: any = {
      llmProvider: 'mock',
      apiKey: '',
      model: 'mock-model',
      headlessBrowser: true,
      requireApprovalForConsequential: false,
      autoVerify: true,
    };

    const mockBrowserService = {
      navigate: async (url: string) => ({
        url,
        title: 'Mock Page',
        status: 200,
        content: 'Mock content',
      }),
      readPageContent: async () => ({
        title: 'Mock Page',
        url: 'https://example.com',
        textContent: 'Mock text content',
      }),
      click: async () => true,
      fill: async () => true,
      getScreenshot: async () => 'data:image/png;base64,mock',
      setTakeover: () => {},
      getIsControlledByAgent: () => true,
      getPage: () => ({ url: () => 'https://example.com', title: async () => 'Example' }),
      broadcastCurrentState: async () => {},
    };

    toolRegistry = new ToolRegistry();
    planner = new TaskPlanner(toolRegistry, settings);

    const verificationEngine = {
      verifyTask: async () => ({ status: 'VERIFIED', details: 'OK', artifactsVerified: [] }),
    };

    engine = new ExecutionEngine(
      toolRegistry,
      mockBrowserService as any,
      artifactService,
      { isConsequential: () => false, requestApproval: async () => true } as any,
      verificationEngine as any,
      { saveTask: () => {}, getTask: () => null, getAllTasks: () => [], logAction: () => {} } as any,
      { broadcast: () => {} } as any,
      {
        onStatusChanged: () => {},
        onPlanUpdated: () => {},
        onStepUpdated: () => {},
        onLogAdded: () => {},
        onApprovalRequested: () => {},
      },
      tabManager
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. AI Agent: Normal research requests stay inside chat and DO NOT navigate visible tabs', async () => {
    // Normal research requests
    const researchQueries = [
      'Research five AI startups and compare their pricing.',
      'Find the cheapest laptop with 16 GB RAM.',
      'Compare products across multiple websites.',
      'Summarize https://example.com content for me',
    ];

    for (const query of researchQueries) {
      const plan = await planner.createPlan(query);
      // Ensure none of the steps have openInTab === true
      for (const step of plan.steps) {
        expect(step.params?.openInTab).not.toBe(true);
      }
    }
  });

  it('2. AI Agent: Explicit website opening commands navigate visible tab with openInTab', async () => {
    const siteCommands = [
      { prompt: 'open YouTube', expectedUrl: 'https://www.youtube.com' },
      { prompt: 'open GitHub', expectedUrl: 'https://github.com' },
      { prompt: 'open LinkedIn', expectedUrl: 'https://www.linkedin.com' },
      { prompt: 'open google.com', expectedUrl: 'https://www.google.com' },
      { prompt: 'GitHub kholo', expectedUrl: 'https://github.com' },
      { prompt: 'YouTube open karo', expectedUrl: 'https://www.youtube.com' },
      { prompt: 'open https://example.com', expectedUrl: 'https://example.com' },
    ];

    for (const cmd of siteCommands) {
      const plan = await planner.createPlan(cmd.prompt);
      expect(plan.steps.length).toBeGreaterThanOrEqual(1);
      expect(plan.steps[0].params?.url).toBe(cmd.expectedUrl);
      expect(plan.steps[0].params?.openInTab).toBe(true);
    }
  });

  it('3. AI Agent: Informational questions about websites DO NOT trigger website opening', async () => {
    const infoQueries = [
      'What is YouTube?',
      'Tell me about GitHub',
      'Explain LinkedIn business model',
      'YouTube kya hai aur kaise kaam karta hai',
    ];

    for (const query of infoQueries) {
      const plan = await planner.createPlan(query);
      // None of the steps should have openInTab set to true
      for (const step of plan.steps) {
        expect(step.params?.openInTab).not.toBe(true);
      }
    }
  });

  it('4. PDF & Report Lifecycle: Generates unique non-colliding reports without overwriting', async () => {
    // Run 1: Laptop comparison
    const laptopPlan = await planner.createPlan('Find cheapest laptop with 16 GB RAM');
    const laptopRecord = await engine.executePlan('task-laptop-1', laptopPlan);
    expect(laptopRecord.status).toBe('completed');
    expect(laptopRecord.verificationStatus).toBe('VERIFIED');
    expect(laptopRecord.pdfReportPath).toContain('laptop');

    const firstLaptopPath = laptopRecord.pdfReportPath!;
    expect(fs.existsSync(firstLaptopPath)).toBe(true);

    // Run 2: Laptop comparison again - MUST NOT overwrite first file
    const laptopPlan2 = await planner.createPlan('Find cheapest laptop with 16 GB RAM again');
    const laptopRecord2 = await engine.executePlan('task-laptop-2', laptopPlan2);
    expect(laptopRecord2.status).toBe('completed');
    expect(laptopRecord2.verificationStatus).toBe('VERIFIED');

    const secondLaptopPath = laptopRecord2.pdfReportPath!;
    expect(fs.existsSync(secondLaptopPath)).toBe(true);
    // Both files must exist independently
    expect(firstLaptopPath).not.toBe(secondLaptopPath);

    // Run 3: Mango produce comparison
    const mangoPlan = await planner.createPlan('Compare mango prices');
    const mangoRecord = await engine.executePlan('task-mango-3', mangoPlan);
    expect(mangoRecord.status).toBe('completed');
    expect(mangoRecord.verificationStatus).toBe('VERIFIED');
    expect(mangoRecord.pdfReportPath).toContain('mango');

    // Run 4: AI Startups research
    const aiPlan = await planner.createPlan('Research five AI startups and pricing');
    const aiRecord = await engine.executePlan('task-ai-4', aiPlan);
    expect(aiRecord.status).toBe('completed');
    expect(aiRecord.verificationStatus).toBe('VERIFIED');
    expect(aiRecord.pdfReportPath).toContain('startup');

    // All distinct artifacts must be present
    const allArtifacts = await artifactService.listAllArtifacts();
    expect(allArtifacts.length).toBeGreaterThanOrEqual(4);
    const names = allArtifacts.map((a) => a.name);
    expect(names.some((n) => n.includes('laptop'))).toBe(true);
    expect(names.some((n) => n.includes('mango'))).toBe(true);
    expect(names.some((n) => n.includes('startup'))).toBe(true);
  });

  it('5. Search Providers & Address Bar: Resolves Google, DuckDuckGo, Bing, Brave, and direct URLs', () => {
    // Google
    expect(resolveUrlOrSearch('laptops 16gb', 'google')).toBe(
      'https://www.google.com/search?q=laptops%2016gb'
    );
    // DuckDuckGo
    expect(resolveUrlOrSearch('laptops 16gb', 'duckduckgo')).toBe(
      'https://duckduckgo.com/?q=laptops%2016gb'
    );
    // Bing
    expect(resolveUrlOrSearch('laptops 16gb', 'bing')).toBe(
      'https://www.bing.com/search?q=laptops%2016gb'
    );
    // Brave
    expect(resolveUrlOrSearch('laptops 16gb', 'brave')).toBe(
      'https://search.brave.com/search?q=laptops%2016gb'
    );

    // Valid direct URLs navigate directly without searching
    expect(resolveUrlOrSearch('youtube.com', 'google')).toBe('https://youtube.com');
    expect(resolveUrlOrSearch('https://github.com', 'duckduckgo')).toBe('https://github.com');
    expect(resolveUrlOrSearch('http://localhost:3000', 'brave')).toBe('http://localhost:3000');
    expect(resolveUrlOrSearch('en.wikipedia.org/wiki/Earth', 'bing')).toBe('https://en.wikipedia.org/wiki/Earth');
  });

  it('6. Live Wallpaper: 2.5s timer operates only in Dark Live Wallpaper mode, stops in Soft Light and Dark Cosmic', () => {
    const wallpaperService = new WallpaperService(store, () => null, path.join(tempDir, 'wallpapers'));

    // Start with Dark Live Wallpaper
    wallpaperService.handleSettingsChanged({
      theme: 'dark',
      themeMode: 'live-wallpaper',
      shortcuts: [],
      searchEngine: 'google',
    });
    // Timer should be active
    expect((wallpaperService as any).timer).not.toBeNull();

    // Switch to Soft Light -> timer must immediately stop
    wallpaperService.handleSettingsChanged({
      theme: 'light',
      themeMode: 'soft-light',
      shortcuts: [],
      searchEngine: 'google',
    });
    expect((wallpaperService as any).timer).toBeNull();

    // Switch to Dark Cosmic -> timer must remain stopped
    wallpaperService.handleSettingsChanged({
      theme: 'dark',
      themeMode: 'dark-cosmic',
      shortcuts: [],
      searchEngine: 'google',
    });
    expect((wallpaperService as any).timer).toBeNull();
  });
});
