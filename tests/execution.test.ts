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
import type { AppSettings } from '../src/shared/types';

describe('ExecutionEngine and Planner Demonstration Workflow', () => {
  const testDir = path.resolve(__dirname, 'temp_exec_test');
  const artifactDir = path.resolve(testDir, 'artifacts');
  const dbPath = path.resolve(testDir, 'test.sqlite');

  let artifactService: ArtifactService;
  let dbService: DatabaseService;
  let wsService: WebSocketService;
  let toolRegistry: ToolRegistry;
  let approvalManager: ApprovalManager;
  let verificationEngine: VerificationEngine;
  let planner: TaskPlanner;
  let engine: ExecutionEngine;

  const mockBrowserService = {
    navigate: async (url: string) => ({ url, title: 'Example Domain', status: 200 }),
    readPageContent: async () => ({ title: 'Example Domain', url: 'https://example.com', textContent: 'This domain is for use in documentation examples', elementsFound: 1 }),
    click: async () => true,
    fill: async () => true,
    getScreenshot: async () => 'data:image/png;base64,mock',
    setTakeover: () => {},
    getIsControlledByAgent: () => true,
    getPage: () => ({ url: () => 'https://example.com', title: async () => 'Example Domain' }),
    broadcastCurrentState: async () => {},
  };

  const settings: AppSettings = {
    llmProvider: 'mock',
    apiKey: '',
    model: 'mock-model',
    headlessBrowser: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    requireApprovalForConsequential: true,
    autoVerify: true,
  };

  beforeEach(() => {
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }
    artifactService = new ArtifactService(artifactDir);
    dbService = new DatabaseService(dbPath);
    wsService = new WebSocketService(5199);
    toolRegistry = new ToolRegistry();
    approvalManager = new ApprovalManager(true);
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
      }
    );
  });

  afterEach(() => {
    try {
      dbService.close();
      wsService.stop();
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('plans and executes AI startups research workflow with VERIFIED status', async () => {
    const goal = 'Research five AI startups, collect company names, products, pricing and source URLs, create a CSV file, and verify the saved result.';
    const plan = await planner.createPlan(goal);

    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(plan.steps[0].tool).toBe('browser_navigate');
    expect(plan.steps[plan.steps.length - 1].tool).toBe('verify_csv_artifact');

    const result = await engine.executePlan('task-demo-run-1', plan);

    expect(result.status).toBe('completed');
    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.artifacts && result.artifacts.length > 0).toBe(true);

    // Verify physical CSV was created and contains 5 rows
    const csvRead = await artifactService.readAndParseCsv('artifacts/startups.csv');
    expect(csvRead.rowCount).toBe(5);
    expect(csvRead.headers).toContain('company_name');
    expect(csvRead.headers).toContain('product');
    expect(csvRead.headers).toContain('pricing');
    expect(csvRead.headers).toContain('source_url');
  });

  it('pauses and respects user cancellation during execution', async () => {
    const goal = 'Research AI startups';
    const plan = await planner.createPlan(goal);

    // Cancel before step completion
    const executionPromise = engine.executePlan('task-cancel-run', plan);
    engine.cancel('task-cancel-run');

    const result = await executionPromise;
    expect(result.status).toBe('cancelled');
  });

  it('plans and executes direct URL workflow for https://example.com with real title and VERIFIED status', async () => {
    const goal = 'https://example.com';
    const plan = await planner.createPlan(goal);

    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(plan.steps[0].tool).toBe('browser_navigate');
    expect(plan.steps[0].params.url).toBe('https://example.com');

    const result = await engine.executePlan('task-example-url-run', plan);

    expect(result.status).toBe('completed');
    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.artifacts && result.artifacts.length > 0).toBe(true);

    const csvRead = await artifactService.readAndParseCsv('artifacts/page_extract.csv');
    expect(csvRead.rowCount).toBe(1);
    expect(csvRead.headers).toContain('url');
    expect(csvRead.headers).toContain('title');
    expect(csvRead.headers).toContain('visible_text');
  });
});
