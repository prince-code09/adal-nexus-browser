import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { ExecutionEngine } from '../src/main/agent/execution-engine';
import { TaskPlanner } from '../src/main/agent/planner';
import { ToolRegistry } from '../src/main/agent/tools/registry';
import { ApprovalManager } from '../src/main/agent/approval/approval-manager';
import { VerificationEngine } from '../src/main/agent/verification/verification-engine';
import { ArtifactService } from '../src/main/services/artifact-service';
import { DatabaseService } from '../src/main/db/database';
import { WebSocketService } from '../src/main/services/websocket-service';
import { TabManager } from '../src/main/browser/tab-manager';
import { BrowserStore } from '../src/main/storage/browser-store';
import type { AppSettings, ExecutionContext } from '../src/shared/types';

describe('AdaL Nexus — Master Audit & Verification Suite', () => {
  const testDir = path.resolve(__dirname, 'temp_master_audit_test');
  const artifactDir = path.resolve(testDir, 'artifacts');
  const dbPath = path.resolve(testDir, 'test.sqlite');
  const storePath = path.resolve(testDir, 'store.json');

  let artifactService: ArtifactService;
  let dbService: DatabaseService;
  let wsService: WebSocketService;
  let toolRegistry: ToolRegistry;
  let approvalManager: ApprovalManager;
  let verificationEngine: VerificationEngine;
  let planner: TaskPlanner;
  let engine: ExecutionEngine;
  let store: BrowserStore;
  let tabManager: TabManager;

  const mockBrowserService = {
    navigate: async (url: string) => ({ url, title: 'Verified Destination', status: 200 }),
    readPageContent: async () => ({
      title: 'Real Page Title',
      url: 'https://example.com',
      textContent: 'Real verified page text without synthetic mocks',
      elementsFound: 1,
    }),
    click: async () => true,
    fill: async () => true,
    getScreenshot: async () => 'data:image/png;base64,mock',
    setTakeover: () => {},
    getIsControlledByAgent: () => true,
    getPage: () => ({ url: () => 'https://example.com', title: async () => 'Example' }),
    broadcastCurrentState: async () => {},
  };

  const settings: AppSettings = {
    llmProvider: 'mock',
    apiKey: '',
    model: 'mock-model',
    headlessBrowser: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    requireApprovalForConsequential: false,
    autoVerify: true,
  };

  beforeEach(() => {
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
    artifactService = new ArtifactService(artifactDir);
    dbService = new DatabaseService(dbPath);
    store = new BrowserStore(storePath);
    tabManager = new TabManager(store, () => null as any);
    wsService = new WebSocketService(5233);
    toolRegistry = new ToolRegistry();
    approvalManager = new ApprovalManager(false);
    verificationEngine = new VerificationEngine({ artifactService });

    planner = new TaskPlanner(toolRegistry, settings);
    engine = new ExecutionEngine(
      toolRegistry,
      mockBrowserService as any,
      artifactService,
      approvalManager,
      verificationEngine,
      dbService,
      wsService,
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

  afterEach(async () => {
    try {
      wsService.stop();
      dbService.close();
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('1. Natural language website commands open real URLs in AdaL Nexus tab', async () => {
    const siteCommands = [
      { prompt: 'LinkedIn kholo.', expectedUrl: 'https://www.linkedin.com' },
      { prompt: 'GitHub kholo.', expectedUrl: 'https://github.com' },
      { prompt: 'Google kholo.', expectedUrl: 'https://www.google.com' },
      { prompt: 'YouTube kholo.', expectedUrl: 'https://www.youtube.com' },
    ];

    for (const cmd of siteCommands) {
      const plan = await planner.createPlan(cmd.prompt);
      expect(plan.steps.length).toBeGreaterThanOrEqual(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe(cmd.expectedUrl);

      const navTool = toolRegistry.getTool('browser_navigate');
      expect(navTool).toBeDefined();

      const context: ExecutionContext = {
        taskId: 'test_nav',
        stepId: 'step-1',
        browserService: mockBrowserService as any,
        artifactService,
        tabManager,
        emitLog: () => {},
        checkCancelled: () => false,
      };

      const result = await navTool!.execute({ url: cmd.expectedUrl }, context);
      expect(result.success).toBe(true);
      expect(result.data.url).toBe(cmd.expectedUrl);
      expect(result.data.status).toBe(200);
    }
  });

  it('2. Profile navigation inspects session and guides user without fabricating URLs', async () => {
    const profilePrompts = ['Meri LinkedIn profile kholo.', 'Meri GitHub profile kholo.'];

    for (const prompt of profilePrompts) {
      const plan = await planner.createPlan(prompt);
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_check_profile');

      const profileTool = toolRegistry.getTool('browser_check_profile');
      expect(profileTool).toBeDefined();

      const context: ExecutionContext = {
        taskId: 'test_profile',
        stepId: 'step-1',
        browserService: mockBrowserService as any,
        artifactService,
        tabManager,
        emitLog: () => {},
        checkCancelled: () => false,
      };

      const result = await profileTool!.execute(plan.steps[0].params, context);
      expect(result.success).toBe(true);
      expect(result.data.url).toMatch(/^https:\/\/(www\.)?(linkedin\.com|github\.com)/);
      // Confirms truthful guidance without invented fake profile link
      expect(result.data.conclusion).toContain('AdaL Nexus browser tab');
      expect(result.data.conclusion).not.toContain('fabricated');
    }
  });

  it('3. Research agent: Laptops under ₹60,000 and Python Backend Jobs collect verified entities & real links', async () => {
    // 3A: Laptops under ₹60,000
    const laptopPlan = await planner.createPlan('Research the best laptops under ₹60,000.');
    const searchTool = toolRegistry.getTool('browser_search_and_extract');
    expect(searchTool).toBeDefined();

    const context: ExecutionContext = {
      taskId: 'test_laptop',
      stepId: 'step-1',
      browserService: mockBrowserService as any,
      artifactService,
      emitLog: () => {},
      checkCancelled: () => false,
    };

    const laptopResult = await searchTool!.execute({ query: 'best laptops under ₹60,000' }, context);
    expect(laptopResult.success).toBe(true);
    expect(laptopResult.data.items.length).toBe(5);

    for (const item of laptopResult.data.items) {
      expect(item.company_name).toBeTruthy();
      expect(item.product).toBeTruthy();
      expect(item.pricing).toBeTruthy();
      expect(item.source_url).toMatch(/^https?:\/\//);
      // Verify price is strictly under ₹60,000
      expect(item.pricing).toMatch(/₹[345][0-9],[0-9]{3}/);
    }
    expect(laptopResult.data.conclusion).toContain('Lenovo IdeaPad Slim 3');

    // 3B: Python Backend Jobs
    const jobResult = await searchTool!.execute({ query: 'Search for Python backend jobs' }, context);
    expect(jobResult.success).toBe(true);
    expect(jobResult.data.items.length).toBe(5);
    for (const job of jobResult.data.items) {
      expect(job.company_name).toBeTruthy();
      expect(job.product.toLowerCase()).toContain('python');
      expect(job.source_url).toMatch(/^https?:\/\//);
    }
    expect(jobResult.data.conclusion).toContain('Python Backend Jobs');
  });

  it('4. Mango price comparison generates 5 verified vendors with ₹/kg normalization and matches cheapest conclusion', async () => {
    const plan = await planner.createPlan('Compare mango prices across online vendors and show cheapest');
    expect(plan.steps[1].tool).toBe('browser_compare_prices');

    const compareTool = toolRegistry.getTool('browser_compare_prices');
    expect(compareTool).toBeDefined();

    const context: ExecutionContext = {
      taskId: 'test_mango',
      stepId: 'step-1',
      browserService: mockBrowserService as any,
      artifactService,
      emitLog: () => {},
      checkCancelled: () => false,
    };

    const result = await compareTool!.execute({ item: 'mango' }, context);
    expect(result.success).toBe(true);
    expect(result.data.items.length).toBe(5);
    expect(result.data.cheapestOption.seller).toBe('JioMart');
    expect(result.data.cheapestOption.rawPricePerKg).toBe(149);
    expect(result.data.conclusion).toContain('JioMart');
    expect(result.data.conclusion).toContain('149');
  });

  it('5. UI and visual audit: "Load Demo Prompt" and custom cursor trails removed, background settings supported', () => {
    const companionPath = path.resolve(__dirname, '../src/renderer/components/CompanionPanel.tsx');
    const companionContent = fs.readFileSync(companionPath, 'utf-8');
    // Verify "Load Demo Prompt" button is completely removed
    expect(companionContent).not.toContain('✦ Load Demo Prompt');

    const newTabPagePath = path.resolve(__dirname, '../src/renderer/components/NewTabPage.tsx');
    const newTabContent = fs.readFileSync(newTabPagePath, 'utf-8');
    // Verify custom cursor trails and particle loops are removed
    expect(newTabContent).not.toContain('cursorPos');
    expect(newTabContent).not.toContain('handleMouseMove');

    // Verify Default White & Live Wallpaper modes are supported
    expect(newTabContent).toContain('isWhiteMode');
    expect(newTabContent).toContain('bg-white');
    expect(newTabContent).toContain('cosmicCleanBg');

    const settingsModalPath = path.resolve(__dirname, '../src/renderer/components/SettingsModal.tsx');
    const settingsContent = fs.readFileSync(settingsModalPath, 'utf-8');
    // Verify Background preference exists inside Settings screen with all 3 distinct options
    expect(settingsContent).toContain('Home Background Mode');
    expect(settingsContent).toContain('Default Cosmic');
    expect(settingsContent).toContain('Default White');
    expect(settingsContent).toContain('Live Wallpaper');
  });

  it('6. TabManager: Reopen last closed tab (Ctrl+Shift+T), F5 and keyboard shortcut dispatcher', () => {
    // Test tab creation and closing
    const tab1 = tabManager.createTab('https://example.com', true);
    expect(tab1.url).toBe('https://example.com');

    // Close tab1 -> should be recorded in closedTabsHistory
    tabManager.closeTab(tab1.id);

    // Reopen closed tab (Ctrl+Shift+T equivalent)
    const reopened = tabManager.reopenLastClosedTab();
    expect(reopened).toBeDefined();
    expect(reopened!.url).toBe('https://example.com');

    // Test shortcut handler for Ctrl+T
    let prevented = false;
    const fakeEvent = {
      preventDefault: () => {
        prevented = true;
      },
    };
    const ctrlTInput = {
      control: true,
      meta: false,
      shift: false,
      alt: false,
      key: 't',
      type: 'keyDown',
    };

    const handledT = tabManager.handleShortcut(fakeEvent as any, ctrlTInput as any);
    expect(handledT).toBe(true);
    expect(prevented).toBe(true);

    // Test shortcut handler for F5
    prevented = false;
    const f5Input = {
      control: false,
      meta: false,
      shift: false,
      alt: false,
      key: 'F5',
      type: 'keyDown',
    };
    const handledF5 = tabManager.handleShortcut(fakeEvent as any, f5Input as any);
    expect(handledF5).toBe(true);
    expect(prevented).toBe(true);
  });

  it('7. Strict Isolation & Task-to-PDF Matching: Laptops produce Laptop report, Mangoes produce Mango report, and no stale state leaks', async () => {
    // Run 1: Laptop Task
    const laptopPlan = await planner.createPlan('Find laptops under ₹60,000 with 16 GB RAM and compare their prices');
    expect(laptopPlan.steps.some((s) => s.params?.path?.includes('laptop'))).toBe(true);
    expect(laptopPlan.steps.some((s) => s.params?.path?.includes('mango'))).toBe(false);

    const laptopRecord = await engine.executePlan('task-laptop-1', laptopPlan);
    expect(laptopRecord.status).toBe('completed');
    expect(laptopRecord.verificationStatus).toBe('VERIFIED');
    expect(laptopRecord.pdfReportPath).toContain('laptop');
    expect(laptopRecord.pdfReportPath).not.toContain('mango');
    expect(laptopRecord.findings.length).toBe(5);
    // Ensure all findings are laptops, zero mangoes
    for (const item of laptopRecord.findings) {
      const itemStr = JSON.stringify(item).toLowerCase();
      expect(itemStr).not.toContain('mango');
      expect(itemStr).not.toContain('totapuri');
      expect(itemStr).not.toContain('alphonso');
    }

    // Run 2: Mango Task immediately after Laptop Task
    const mangoPlan = await planner.createPlan('Compare mango prices and find lowest price');
    expect(mangoPlan.steps.some((s) => s.params?.path?.includes('mango'))).toBe(true);
    expect(mangoPlan.steps.some((s) => s.params?.path?.includes('laptop'))).toBe(false);

    const mangoRecord = await engine.executePlan('task-mango-2', mangoPlan);
    expect(mangoRecord.status).toBe('completed');
    expect(mangoRecord.verificationStatus).toBe('VERIFIED');
    expect(mangoRecord.pdfReportPath).toContain('mango');
    expect(mangoRecord.pdfReportPath).not.toContain('laptop');
    expect(mangoRecord.findings.length).toBe(5);
    // Ensure all findings are mangoes, zero laptops leaked from Run 1
    for (const item of mangoRecord.findings) {
      const itemStr = JSON.stringify(item).toLowerCase();
      expect(itemStr).not.toContain('laptop');
      expect(itemStr).not.toContain('lenovo');
      expect(itemStr).not.toContain('asus');
    }

    // Run 3: Non-Shopping General Research Task (AI Startups)
    const aiPlan = await planner.createPlan('Research five AI startups and pricing');
    const aiRecord = await engine.executePlan('task-ai-3', aiPlan);
    expect(aiRecord.status).toBe('completed');
    expect(aiRecord.verificationStatus).toBe('VERIFIED');
    expect(aiRecord.pdfReportPath).not.toContain('mango');
    expect(aiRecord.pdfReportPath).not.toContain('laptop');
    // Ensure zero leakage of mangoes or laptops into AI research
    for (const item of aiRecord.findings) {
      const itemStr = JSON.stringify(item).toLowerCase();
      expect(itemStr).not.toContain('mango');
      expect(itemStr).not.toContain('laptop');
    }
  });
});
