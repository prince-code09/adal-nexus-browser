import { describe, it, expect, beforeEach } from 'vitest';
import { MockLocalAIAdapter } from '../src/main/agent/adapters/mock-adapter';
import { ToolRegistry } from '../src/main/agent/tools/registry';
import { TaskPlanner } from '../src/main/agent/planner';
import { ExecutionEngine } from '../src/main/agent/execution-engine';
import { ApprovalManager } from '../src/main/agent/approval/approval-manager';
import { VerificationEngine } from '../src/main/agent/verification/verification-engine';
import { ArtifactService } from '../src/main/services/artifact-service';
import * as path from 'path';
import * as fs from 'fs';

describe('Autonomous Browser Agent & Multi-Mode Execution Suite', () => {
  let toolRegistry: ToolRegistry;
  let adapter: MockLocalAIAdapter;
  let artifactService: ArtifactService;
  let verificationEngine: VerificationEngine;
  let approvalManager: ApprovalManager;
  let mockBrowserService: any;
  let mockTabManager: any;
  let mockDb: any;
  let mockWs: any;
  const testArtifactsDir = path.join(__dirname, 'temp_test_agent_artifacts');

  beforeEach(() => {
    if (!fs.existsSync(testArtifactsDir)) {
      fs.mkdirSync(testArtifactsDir, { recursive: true });
    }

    toolRegistry = new ToolRegistry();
    adapter = new MockLocalAIAdapter();
    artifactService = new ArtifactService(testArtifactsDir);
    verificationEngine = new VerificationEngine({ artifactService });
    approvalManager = new ApprovalManager(true);

    mockBrowserService = {
      navigate: async (url: string) => ({ url, title: 'Mock Page', status: 200 }),
      readPageContent: async () => ({ title: 'Mock Title', url: 'https://example.com', textContent: 'Sample content' }),
      click: async () => true,
      fill: async () => true,
      getScreenshot: async () => 'data:image/png;base64,mock',
      getPage: () => null,
      getIsControlledByAgent: () => true,
      setTakeover: () => {},
    };

    mockTabManager = {
      navigatedUrl: '',
      tabs: [{ id: 'tab-1', url: 'about:blank', title: 'New Tab', isNewTab: true }],
      getActiveTab() {
        return this.tabs[0];
      },
      createTab(url: string) {
        this.navigatedUrl = url;
        const newTab = { id: 'tab-2', url, title: url, isNewTab: false };
        this.tabs.push(newTab);
        return newTab;
      },
      navigate(tabId: string, url: string) {
        this.navigatedUrl = url;
        if (this.tabs[0]) {
          this.tabs[0].url = url;
          this.tabs[0].title = url;
          this.tabs[0].isNewTab = false;
        }
      },
    };

    mockDb = {
      saveTask: () => {},
      logAction: () => {},
    };

    mockWs = {
      broadcast: () => {},
    };
  });

  // =========================================================================
  // Mode A: Normal Conversation (The Default)
  // =========================================================================
  describe('Mode A: Normal Conversation (Chatbot Default without Navigation)', () => {
    it('1. "What is LinkedIn?" responds conversationally with no browser navigation or PDF creation', async () => {
      const goal = 'What is LinkedIn?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan).toBeDefined();
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/professional networking|LinkedIn is the world/i);

      // Verify execution: No tab navigation, no PDF
      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-1', plan);
      expect(record.status).toBe('completed');
      expect(record.verificationStatus).toBe('VERIFIED');
      expect(mockTabManager.navigatedUrl).toBe(''); // Tab was NOT navigated
      expect(record.artifacts?.length || 0).toBe(0); // Zero PDF/CSV deliverables
    });

    it('2. "Which laptop is best with 16 GB RAM?" answers conversationally with recommendation guide', async () => {
      const goal = 'Which laptop is best with 16 GB RAM?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Lenovo IdeaPad Slim 3|ASUS Vivobook|Acer Aspire|RAM)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-2', plan);
      expect(record.status).toBe('completed');
      expect(record.verificationStatus).toBe('VERIFIED');
      expect(mockTabManager.navigatedUrl).toBe(''); // Tab was NOT navigated
      expect(record.artifacts?.length || 0).toBe(0);
    });

    it('3. "How do I upload a post on LinkedIn?" provides step-by-step instructions in chat', async () => {
      const goal = 'How do I upload a post on LinkedIn?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Start a post|Sign in|visibility|publish|Step-by-Step)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-3', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe('');
      expect(record.artifacts?.length || 0).toBe(0);
    });

    it('4. "What are the minimum processor requirements for a laptop?" explains processor specs', async () => {
      const goal = 'What are the minimum processor requirements for a laptop?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Core i3|Core i5|Ryzen 5|cores|threads)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-4', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe('');
      expect(record.artifacts?.length || 0).toBe(0);
    });

    it('5. "What is YouTube?" explains YouTube in chat with zero browser navigation', async () => {
      const goal = 'What is YouTube?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(video sharing|streaming|YouTube is the world)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-5', plan);
      expect(record.status).toBe('completed');
      expect(record.verificationStatus).toBe('VERIFIED');
      expect(mockTabManager.navigatedUrl).toBe(''); // NO tab navigation
      expect(record.artifacts?.length || 0).toBe(0); // Zero PDF reports
    });

    it('6. "What are the best Java DSA playlists?" provides curated playlist recommendations in chat', async () => {
      const goal = 'What are the best Java DSA playlists?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Striver|Kunal Kushwaha|Abdul Bari|Love Babbar|DSA)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-6', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe(''); // Zero navigation
      expect(record.artifacts?.length || 0).toBe(0);
    });

    it('7. "Notes Gallery kya hai?" explains Notes Gallery in chat without navigation', async () => {
      const goal = 'Notes Gallery kya hai?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Notes Gallery|study|repository|PYQ|academic)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-7', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe('');
      expect(record.artifacts?.length || 0).toBe(0);
    });

    it('8. "DSTL kya hai?" explains Discrete Structures curriculum in chat without navigation', async () => {
      const goal = 'DSTL kya hai?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Discrete Structures|Set Theory|Algebraic Structures|Graph Theory|Units)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-8', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe('');
      expect(record.artifacts?.length || 0).toBe(0);
    });

    it('9. "What is Saiyaara?" explains the song and meaning in chat with zero navigation or PDF', async () => {
      const goal = 'What is Saiyaara?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Saiyaara|Ek Tha Tiger|romantic|Mohit Chauhan|planet)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-9', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe(''); // Zero navigation
      expect(record.artifacts?.length || 0).toBe(0); // Zero PDF
    });

    it('10. "Saiyaara kya hai?" answers conversationally in Hinglish without browser navigation', async () => {
      const goal = 'Saiyaara kya hai?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Ek Tha Tiger|romantic song|Salman Khan|Saiyaara)/i);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-conv-10', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe(''); // Zero navigation
      expect(record.artifacts?.length || 0).toBe(0);
    });
  });

  // =========================================================================
  // Mode B: Explicit Website Opening
  // =========================================================================
  describe('Mode B: Explicit Website Opening (User Commanded Navigation)', () => {
    it('1. "LinkedIn kholo" navigates visible browser tab to https://www.linkedin.com', async () => {
      const goal = 'LinkedIn kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://www.linkedin.com');
      expect(plan.steps[0].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-open-1', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe('https://www.linkedin.com');
      expect(record.artifacts?.length || 0).toBe(0);
    });

    it('2. "Amazon open karo" navigates visible browser tab to https://www.amazon.in', async () => {
      const goal = 'Amazon open karo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://www.amazon.in');
      expect(plan.steps[0].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      await engine.executePlan('task-open-2', plan);
      expect(mockTabManager.navigatedUrl).toBe('https://www.amazon.in');
    });

    it('3. "YouTube open karo" navigates visible browser tab to https://www.youtube.com', async () => {
      const goal = 'YouTube open karo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://www.youtube.com');
      expect(plan.steps[0].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      await engine.executePlan('task-open-3', plan);
      expect(mockTabManager.navigatedUrl).toBe('https://www.youtube.com');
    });

    it('4. "Laptop ke 16 GB RAM wale options wali website khol kar dikhao" opens Amazon 16GB laptop catalog in visible tab', async () => {
      const goal = 'Laptop ke 16 GB RAM wale options wali website khol kar dikhao';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toContain('laptops+16gb+ram');
      expect(plan.steps[0].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      await engine.executePlan('task-open-4', plan);
      expect(mockTabManager.navigatedUrl).toContain('laptops+16gb+ram');
    });

    it('5. "LinkedIn par post upload karne ke liye LinkedIn kholo" opens LinkedIn in visible tab without posting yet', async () => {
      const goal = 'LinkedIn par post upload karne ke liye LinkedIn kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://www.linkedin.com');
      expect(plan.steps[0].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      await engine.executePlan('task-open-5', plan);
      expect(mockTabManager.navigatedUrl).toBe('https://www.linkedin.com');
    });
  });

  // =========================================================================
  // Mode C: Explicit Website Actions (LinkedIn Post Workflow with Approval Gate)
  // =========================================================================
  describe('Mode C: Explicit Website Actions (LinkedIn Post with Auth and Approval)', () => {
    it('1. Plans post upload with approval requirement and extracted post text', async () => {
      const goal =
        'LinkedIn kholo aur meri ye post upload karo: Excited to announce our new project launch today!';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[1].tool).toBe('browser_linkedin_post');
      expect(plan.steps[1].requiresApproval).toBe(true);
      expect(plan.steps[1].params.postText).toBe(
        'Excited to announce our new project launch today!'
      );
    });

    it('2. Stops and prompts manual login when user is not logged in', async () => {
      const plan = {
        goal: 'LinkedIn kholo aur post upload karo',
        summary: 'LinkedIn post workflow',
        createdAt: Date.now(),
        steps: [
          {
            id: 's-1',
            order: 1,
            description: 'Publish post on LinkedIn',
            tool: 'browser_linkedin_post',
            params: { postText: 'Sample update text', mockLoggedIn: false },
            status: 'pending' as const,
          },
        ],
      };

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-action-login-check', plan);
      expect(record.status).toBe('completed');
      expect(record.resultSummary).toMatch(/not logged in|login page/i);
      expect(mockTabManager.navigatedUrl).toBe('https://www.linkedin.com/login');
    });

    it('3. Requires confirmation approval gate and completes post when approved', async () => {
      let approvalRequested = false;
      const plan = {
        goal: 'LinkedIn kholo aur post upload karo: Live Launch!',
        summary: 'LinkedIn post workflow',
        createdAt: Date.now(),
        steps: [
          {
            id: 's-1',
            order: 1,
            description: 'Publish LinkedIn Post',
            tool: 'browser_linkedin_post',
            params: { postText: 'Live Launch!', mockLoggedIn: true },
            requiresApproval: true,
            status: 'pending' as const,
          },
        ],
      };

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            approvalRequested = true;
            expect(req.actionType).toBe('publish_content');
            expect(req.description).toContain('Live Launch!');
            // Simulate user clicking Approve
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-action-approved', plan);
      expect(approvalRequested).toBe(true);
      expect(record.status).toBe('completed');
      expect(record.resultSummary).toMatch(/Successfully published your post on LinkedIn/i);
    });

    it('4. Halts publication if user rejects approval', async () => {
      const plan = {
        goal: 'LinkedIn kholo aur post upload karo: Cancel this post',
        summary: 'LinkedIn post workflow',
        createdAt: Date.now(),
        steps: [
          {
            id: 's-1',
            order: 1,
            description: 'Publish LinkedIn Post',
            tool: 'browser_linkedin_post',
            params: { postText: 'Cancel this post', mockLoggedIn: true },
            requiresApproval: true,
            status: 'pending' as const,
          },
        ],
      };

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            // Simulate user clicking Reject
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, false);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-action-rejected', plan);
      expect(record.status).toBe('failed');
      expect(record.error).toMatch(/rejected consequential action/i);
    });
  });

  // =========================================================================
  // Section 4: YouTube Multi-Step Video & Playlist Playback Automation
  // =========================================================================
  describe('YouTube Multi-Step Search & Playback Automation', () => {
    it('1. "YouTube kholo aur Java DSA ki achhi series chalao" opens YouTube search and initiates playback', async () => {
      const goal = 'YouTube kholo aur Java DSA ki achhi series chalao';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toContain('youtube.com/results?search_query=');
      expect(plan.steps[0].params.openInTab).toBe(true);

      expect(plan.steps[1].tool).toBe('browser_youtube_play');
      expect(plan.steps[1].params.query).toMatch(/Java DSA/i);
      expect(plan.steps[1].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-yt-play-1', plan);
      expect(record.status).toBe('completed');
      expect(record.verificationStatus).toBe('VERIFIED');
      expect(mockTabManager.navigatedUrl).toContain('youtube.com');
      expect(record.resultSummary).toMatch(/YouTube|playback|initiated/i);
    });

    it('2. "Open YouTube and play a Java DSA playlist" creates multi-step YouTube playback workflow', async () => {
      const goal = 'Open YouTube and play a Java DSA playlist';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[1].tool).toBe('browser_youtube_play');
      expect(plan.steps[1].params.query).toMatch(/Java DSA/i);
    });

    it('3. "open youtube and saiyara gana chalao" extracts Saiyara and does NOT search for Java DSA', async () => {
      const goal = 'open youtube and saiyara gana chalao';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toContain('search_query=saiyara');
      expect(plan.steps[0].params.url).not.toContain('Java');

      expect(plan.steps[1].tool).toBe('browser_youtube_play');
      expect(plan.steps[1].params.query.toLowerCase()).toBe('saiyara');
      expect(plan.steps[1].params.query.toLowerCase()).not.toContain('java');
    });

    it('4. "Saiyaara gana chalao" accurately extracts Saiyaara target entity', async () => {
      const goal = 'Saiyaara gana chalao';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[1].tool).toBe('browser_youtube_play');
      expect(plan.steps[1].params.query.toLowerCase()).toBe('saiyaara');
    });

    it('5. "Play the song Saiyaara" creates playback workflow for Saiyaara', async () => {
      const goal = 'Play the song Saiyaara';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[1].tool).toBe('browser_youtube_play');
      expect(plan.steps[1].params.query.toLowerCase()).toBe('saiyaara');
    });

    it('6. Honest Execution: Reports search results accurately and does NOT claim false playback', async () => {
      // Execute browser_youtube_play when Playwright does not locate an auto-playing video element
      const res = await toolRegistry.executeTool(
        'browser_youtube_play',
        { query: 'saiyara', openInTab: true },
        {
          taskId: 'task-test-honest',
          stepId: 'step-honest-1',
          browserService: mockBrowserService,
          artifactService,
          tabManager: mockTabManager,
          accumulatedFindings: [],
          accumulatedConclusion: '',
          emitLog: () => {},
          checkCancelled: () => false,
        }
      );

      expect(res.success).toBe(true);
      expect(res.data.query).toBe('saiyara');
      // When only search results are open, playing MUST be false (no false success claims)
      expect(res.data.playing).toBe(false);
      expect(res.data.conclusion).toContain('Opened YouTube search results');
      expect(res.data.conclusion).not.toMatch(/initiated playback/i);
    });

    it('7. Verified Playback: Reports playback when video/watch URL is confirmed', async () => {
      const customBrowser = {
        ...mockBrowserService,
        getPage: () => ({
          waitForSelector: async () => {},
          evaluate: async () => ({
            href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            title: 'Saiyaara - Full Song | Ek Tha Tiger',
          }),
        }),
      };

      const res = await toolRegistry.executeTool(
        'browser_youtube_play',
        { query: 'saiyara', openInTab: true },
        {
          taskId: 'task-test-verified',
          stepId: 'step-verified-1',
          browserService: customBrowser,
          artifactService,
          tabManager: mockTabManager,
          accumulatedFindings: [],
          accumulatedConclusion: '',
          emitLog: () => {},
          checkCancelled: () => false,
        }
      );

      expect(res.success).toBe(true);
      expect(res.data.playing).toBe(true);
      expect(res.data.title).toContain('Saiyaara');
      expect(res.data.url).toContain('/watch?v=');
      expect(res.data.conclusion).toMatch(/selected.*for playback/i);
    });

    it('8. Generic YouTube queries extract user targets without hardcoding', async () => {
      const lofiPlan = await adapter.generatePlan('play lofi hip hop radio on youtube', toolRegistry.getAllTools());
      expect(lofiPlan.steps[1].params.query.toLowerCase()).toContain('lofi');
      expect(lofiPlan.steps[1].params.query.toLowerCase()).not.toContain('java');

      const tutorialPlan = await adapter.generatePlan('open youtube and play coding tutorial', toolRegistry.getAllTools());
      expect(tutorialPlan.steps[1].params.query.toLowerCase()).toContain('coding tutorial');
      expect(tutorialPlan.steps[1].params.query.toLowerCase()).not.toContain('java');
    });
  });

  // =========================================================================
  // Section 5: Notes Gallery, PYQs & Genuine Study Material Discovery
  // =========================================================================
  describe('Notes Gallery, PYQs & Genuine Study Material Discovery', () => {
    it('1. "Notes Gallery kholo" opens Notes Gallery view cleanly', async () => {
      const goal = 'Notes Gallery kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('notes_gallery_open');

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-ng-open-1', plan);
      expect(record.status).toBe('completed');
      expect(record.verificationStatus).toBe('VERIFIED');
      expect(record.resultSummary).toMatch(/Notes Gallery opened/i);
    });

    it('2. "Notes Gallery kholo aur DSTL Unit 2 ke PYQs dikhao" locates and opens real existing file', async () => {
      // Place a real mock PYQ file in test artifacts
      const pyqPath = path.join(testArtifactsDir, 'DSTL_Unit2_PYQ_2024.pdf');
      fs.writeFileSync(pyqPath, '%PDF-1.4 mock study document for DSTL Unit 2');

      const goal = 'Notes Gallery kholo aur DSTL Unit 2 ke PYQs dikhao';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('notes_gallery_search_and_open');
      expect(plan.steps[0].params.subject).toBe('DSTL');
      expect(plan.steps[0].params.unit).toBe('Unit 2');
      expect(plan.steps[0].params.category).toBe('PYQ');

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-ng-search-found', plan);
      expect(record.status).toBe('completed');
      expect(record.verificationStatus).toBe('VERIFIED');
      expect(record.resultSummary).toContain('DSTL_Unit2_PYQ_2024.pdf');

      // Cleanup
      try { fs.unlinkSync(pyqPath); } catch {}
    });

    it('3. "Notes Gallery kholo aur DSTL Unit 2 ke PYQs dikhao" reports honestly when file is absent without inventing fake paths', async () => {
      const goal = 'Notes Gallery kholo aur DSTL Unit 2 ke PYQs dikhao';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('notes_gallery_search_and_open');

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-ng-search-not-found', plan);
      expect(record.status).toBe('completed');
      expect(record.verificationStatus).toBe('VERIFIED');
      // Verifies honest message: no fake paths invented!
      expect(record.resultSummary).toMatch(/No local files found|No mock or fabricated resources were created/i);
    });

    it('4. "Mere uploaded PDF ko kholo" searches and opens uploaded PDF file', async () => {
      const samplePdf = path.join(testArtifactsDir, 'lecture_notes_discrete_math.pdf');
      fs.writeFileSync(samplePdf, '%PDF-1.4 sample uploaded lecture notes');

      const goal = 'Mere uploaded PDF ko kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('notes_gallery_search_and_open');

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-ng-pdf-open', plan);
      expect(record.status).toBe('completed');
      expect(record.resultSummary).toContain('lecture_notes_discrete_math.pdf');

      try { fs.unlinkSync(samplePdf); } catch {}
    });
  });

  // =========================================================================
  // Section 2C: Multi-Turn Context Carry-Over & New Chat Isolation
  // =========================================================================
  describe('Multi-Turn Follow-Up Context Carry-Over & New Chat Isolation', () => {
    it('1. Resolves "Ab YouTube kholo aur ek playlist chalao" after asking for best Java DSA playlists', async () => {
      // Turn 1: Conversational query
      const turn1Goal = 'Best Java DSA playlists batao';
      const turn1Plan = await adapter.generatePlan(turn1Goal, toolRegistry.getAllTools());
      expect(turn1Plan.steps[0].tool).toBe('chat_response');

      // Turn 2: Follow-up action with prior context
      const turn2Goal = 'Ab YouTube kholo aur ek playlist chalao';
      const turn2Plan = await adapter.generatePlan(
        turn2Goal,
        toolRegistry.getAllTools(),
        { previousQueries: [turn1Goal] }
      );

      // Verifies context was resolved: knows to play Java DSA playlist!
      expect(turn2Plan.steps.length).toBe(2);
      expect(turn2Plan.steps[0].tool).toBe('browser_navigate');
      expect(turn2Plan.steps[1].tool).toBe('browser_youtube_play');
      expect(turn2Plan.steps[1].params.query).toMatch(/Java DSA/i);
    });

    it('2. Resolves "Ab Unit 2 wala kholo" after asking for DSTL PYQs', async () => {
      // Turn 1: DSTL PYQ query
      const turn1Goal = 'DSTL ke PYQs dikhao';
      // Turn 2: Follow-up specifying Unit 2
      const turn2Goal = 'Ab Unit 2 wala kholo';
      const turn2Plan = await adapter.generatePlan(
        turn2Goal,
        toolRegistry.getAllTools(),
        { previousQueries: [turn1Goal] }
      );

      expect(turn2Plan.steps.length).toBe(1);
      expect(turn2Plan.steps[0].tool).toBe('notes_gallery_search_and_open');
      expect(turn2Plan.steps[0].params.subject).toBe('DSTL');
      expect(turn2Plan.steps[0].params.unit).toBe('Unit 2');
      expect(turn2Plan.steps[0].params.category).toBe('PYQ');
    });

    it('3. New Chat Isolation: A new chat does not leak or continue previous task context', async () => {
      // Fresh new chat: previousQueries is empty
      const freshGoal = 'Notes Gallery kholo';
      const plan = await adapter.generatePlan(
        freshGoal,
        toolRegistry.getAllTools(),
        { previousQueries: [] }
      );

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('notes_gallery_open');
      // Did NOT inherit DSTL or Unit 2 from prior unlinked chats!
      expect(plan.steps[0].params.subject).toBeUndefined();
    });
  });

  // =========================================================================
  // Section 7 & 8: Consequential Permission & 5-Point Structured Explanations
  // =========================================================================
  describe('Consequential Permission & 5-Point Structured Explanations', () => {
    it('1. LinkedIn post permission request explicitly provides all 5 structured points', async () => {
      let capturedApproval: any = null;
      const plan = {
        goal: 'LinkedIn kholo aur post upload karo: Verification Launch',
        summary: 'LinkedIn post workflow',
        createdAt: Date.now(),
        steps: [
          {
            id: 's-post-1',
            order: 1,
            description: 'Publish LinkedIn Post',
            tool: 'browser_linkedin_post',
            params: { postText: 'Verification Launch', mockLoggedIn: true },
            requiresApproval: true,
            status: 'pending' as const,
          },
        ],
      };

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            capturedApproval = req;
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      await engine.executePlan('task-approval-details-1', plan);
      expect(capturedApproval).toBeDefined();

      // Point 1: What action is about to happen
      expect(capturedApproval.title).toContain('LinkedIn Post');
      expect(capturedApproval.description).toContain('Verification Launch');

      // Point 2: Why permission is required
      expect(capturedApproval.whyRequired).toMatch(/visible to your professional network|publicly visible/i);

      // Point 3: What account/data/resource will be affected
      expect(capturedApproval.targetResource).toMatch(/LinkedIn/i);

      // Point 4: What happens if user allows it
      expect(capturedApproval.ifAllowed).toMatch(/publish the exact post content/i);

      // Point 5: What happens if user denies it
      expect(capturedApproval.ifDenied).toMatch(/remain unpublished/i);
    });

    it('2. File deletion request requires approval with 5 points, executes when Allowed', async () => {
      const fileToDelete = path.join(testArtifactsDir, 'temp_to_delete.txt');
      fs.writeFileSync(fileToDelete, 'delete me');
      expect(fs.existsSync(fileToDelete)).toBe(true);

      let capturedApproval: any = null;
      const plan = {
        goal: 'temp_to_delete.txt delete karo',
        summary: 'File deletion plan',
        createdAt: Date.now(),
        steps: [
          {
            id: 's-del-1',
            order: 1,
            description: 'Delete file from artifacts',
            tool: 'file_delete',
            params: { path: 'temp_to_delete.txt' },
            requiresApproval: true,
            status: 'pending' as const,
          },
        ],
      };

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            capturedApproval = req;
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true); // ALLOW
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-del-allow', plan);
      expect(record.status).toBe('completed');
      expect(capturedApproval.whyRequired).toMatch(/delete the selected file/i);
      expect(capturedApproval.ifAllowed).toMatch(/permanently removed/i);
      expect(capturedApproval.ifDenied).toMatch(/remain intact/i);
      // File should now be deleted!
      expect(fs.existsSync(fileToDelete)).toBe(false);
    });

    it('3. File deletion halts immediately and preserves file intact when Denied', async () => {
      const safeFile = path.join(testArtifactsDir, 'safe_file.txt');
      fs.writeFileSync(safeFile, 'keep me safe');
      expect(fs.existsSync(safeFile)).toBe(true);

      const plan = {
        goal: 'safe_file.txt delete karo',
        summary: 'File deletion plan',
        createdAt: Date.now(),
        steps: [
          {
            id: 's-del-2',
            order: 1,
            description: 'Delete file from artifacts',
            tool: 'file_delete',
            params: { path: 'safe_file.txt' },
            requiresApproval: true,
            status: 'pending' as const,
          },
        ],
      };

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, false); // DENY
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-del-deny', plan);
      expect(record.status).toBe('failed');
      expect(record.error).toMatch(/rejected consequential action/i);
      // File remains completely intact on disk!
      expect(fs.existsSync(safeFile)).toBe(true);

      try { fs.unlinkSync(safeFile); } catch {}
    });
  });

  // =========================================================================
  // Mode D: Multi-Step Research Tasks (Preserved Intact)
  // =========================================================================
  describe('Mode D: Multi-Step Research Tasks (Deliverables Preserved)', () => {
    it('1. Plans 5 AI startups research with consolidated PDF report deliverable', async () => {
      const goal = 'Research 5 AI startups, compare pricing, and create report';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBeGreaterThanOrEqual(3);
      expect(plan.steps.some((s) => s.tool === 'file_create_pdf')).toBe(true);
      expect(plan.steps.some((s) => s.tool === 'verify_pdf_artifact')).toBe(true);
    });

    it('2. Plans fresh mango price comparison with consolidated report', async () => {
      const goal = 'Mango ke price compare karke sabse saste vendor ki report banao';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.some((s) => s.tool === 'browser_compare_prices')).toBe(true);
      expect(plan.steps.some((s) => s.tool === 'file_create_pdf')).toBe(true);
    });
  });

  // =========================================================================
  // Critical Fixes: Multilingual Navigation, Sessions & Image-Based Workflows
  // =========================================================================
  describe('Critical Navigation, Voice, Image & Session Persistence Suite', () => {
    it('1. "bhai linkdin kholo" directly navigates to https://www.linkedin.com (does NOT search Google)', async () => {
      const goal = 'bhai linkdin kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://www.linkedin.com');
      expect(plan.steps[0].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: () => {},
        },
        mockTabManager
      );

      await engine.executePlan('task-bhai-linkdin', plan);
      expect(mockTabManager.navigatedUrl).toBe('https://www.linkedin.com');
      expect(mockTabManager.navigatedUrl).not.toContain('google.com/search');
    });

    it('2. "bhai gmail kholo" navigates directly to https://mail.google.com', async () => {
      const goal = 'bhai gmail kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].params.url).toBe('https://mail.google.com');
      expect(plan.steps[0].params.openInTab).toBe(true);
    });

    it('3. "bhaiya yt kholo" navigates directly to https://www.youtube.com', async () => {
      const goal = 'bhaiya yt kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].params.url).toBe('https://www.youtube.com');
      expect(plan.steps[0].params.openInTab).toBe(true);
    });

    it('4. "yaar github kholo" navigates directly to https://github.com', async () => {
      const goal = 'yaar github kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].params.url).toBe('https://github.com');
      expect(plan.steps[0].params.openInTab).toBe(true);
    });

    it('5. Ambiguous "bhai kholo" asks for clarification instead of searching', async () => {
      const goal = 'bhai kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(kya kholna|which website|kya open)/i);
    });

    it('6. "LinkedIn par post kaise upload karte hain?" answers in chat with zero navigation', async () => {
      const goal = 'LinkedIn par post kaise upload karte hain?';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Start a post|photo|publish|LinkedIn)/i);
    });

    it('7. "Is image ke liye LinkedIn description likho" generates professional caption options in chat', async () => {
      const goal = 'Is image ke liye LinkedIn description likho';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools(), {
        attachedImage: {
          name: 'project_award.jpg',
          dataUrl: 'data:image/jpeg;base64,mock',
          path: 'C:\\Users\\Prince Mishra\\Desktop\\project_award.jpg',
          size: 102400,
        },
      });

      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/(Option 1|Professional|Option 2|Option 3|#)/i);
    });

    it('8. Image-attached LinkedIn post requires 5-point approval including image metadata', async () => {
      const goal = 'LinkedIn par meri ye photo post kar do with caption: Excited to share our new browser release!';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools(), {
        attachedImage: {
          name: 'release_banner.png',
          dataUrl: 'data:image/png;base64,mockpng',
          path: 'C:\\Users\\Prince Mishra\\Desktop\\release_banner.png',
          size: 204800,
        },
      });

      expect(plan.steps.some((s) => s.tool === 'browser_linkedin_post')).toBe(true);
      const postStep = plan.steps.find((s) => s.tool === 'browser_linkedin_post');
      expect(postStep?.requiresApproval).toBe(true);
      expect(postStep?.params.imageName).toBe('release_banner.png');

      let capturedReq: any = null;
      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            capturedReq = req;
            setTimeout(() => {
              approvalManager.resolveApproval(req.id, true);
            }, 10);
          },
        },
        mockTabManager
      );

      const record = await engine.executePlan('task-img-post', plan);
      expect(record.status).toBe('completed');
      expect(capturedReq).toBeDefined();
      expect(capturedReq.attachedImage).toBeDefined();
      expect(capturedReq.attachedImage.name).toBe('release_banner.png');
      expect(capturedReq.whyRequired).toBeDefined();
      expect(capturedReq.targetResource).toContain('LinkedIn');
      expect(capturedReq.ifAllowed).toBeDefined();
      expect(capturedReq.ifDenied).toBeDefined();
    });

    it('9. Session partition constant is correctly exported for persistent tab sessions', async () => {
      const { ADAL_SESSION_PARTITION } = await import('../src/main/browser/tab-manager');
      expect(ADAL_SESSION_PARTITION).toBe('persist:adal-profile');
    });
  });

  // =========================================================================
  // ANTIGRAVITY MASTER PROMPT 10: Complete AI Agent, Chatbot, Navigation, Voice, Search & Reliability Suite
  // =========================================================================
  describe('Prompt 10: Complete Navigation, Academic Extraction, Visual Matching & YouTube Ad Verification', () => {
    it('1. "Microsoft Office kholo" opens https://www.office.com directly in visible tab', async () => {
      const goal = 'Microsoft Office kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://www.office.com');

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        { onStatusChanged: () => {}, onPlanUpdated: () => {}, onStepUpdated: () => {}, onLogAdded: () => {} },
        mockTabManager
      );
      await engine.executePlan('task-ms-office', plan);
      expect(mockTabManager.navigatedUrl).toBe('https://www.office.com');
    });

    it('2. "BBD ki website kholo" opens https://bbdu.ac.in directly in visible tab', async () => {
      const goal = 'BBD ki website kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].params.url).toBe('https://bbdu.ac.in');
    });

    it('3. "Hackbriven website kholo" searches Google for official website without inventing domains or searching whole prompt', async () => {
      const goal = 'Hackbriven website kholo';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].params.url.toLowerCase()).toContain('google.com/search?q=hackbriven%20official%20website');
      expect(plan.steps[0].params.url).not.toContain('kholo');
    });

    it('4. Conversational inquiries ("BBD website kya hai?", "Bhai, Microsoft Office kya hai?") stay in chat (Mode A)', async () => {
      const q1 = await adapter.generatePlan('BBD website kya hai?', toolRegistry.getAllTools());
      expect(q1.steps.length).toBe(1);
      expect(q1.steps[0].tool).toBe('chat_response');

      const q2 = await adapter.generatePlan('Bhai, Microsoft Office kya hai?', toolRegistry.getAllTools());
      expect(q2.steps.length).toBe(1);
      expect(q2.steps[0].tool).toBe('chat_response');
    });

    it('5. Normal web search ("Microsoft Office ke features search karo", "Latest AI browser technologies search karo") opens Google search', async () => {
      const s1 = await adapter.generatePlan('Microsoft Office ke features search karo', toolRegistry.getAllTools());
      expect(s1.steps.length).toBe(1);
      expect(s1.steps[0].tool).toBe('browser_navigate');
      expect(s1.steps[0].params.url).toContain('google.com/search');
      expect(s1.steps[0].params.url).toContain('Microsoft%20Office');

      const s2 = await adapter.generatePlan('Latest AI browser technologies search karo', toolRegistry.getAllTools());
      expect(s2.steps.length).toBe(1);
      expect(s2.steps[0].tool).toBe('browser_navigate');
      expect(s2.steps[0].params.url).toContain('google.com/search');
      expect(s2.steps[0].params.url.toLowerCase()).toContain('latest%20ai%20browser%20technologies');
    });

    it('6. "bhai aktu btech 2nd year ka pyq kholo notes gallery se" extracts AKTU, B.Tech, 2nd Year, PYQ and NEVER defaults to DSTL', async () => {
      const goal = 'bhai aktu btech 2nd year ka pyq kholo notes gallery se';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('notes_gallery_search_and_open');
      expect(plan.steps[0].params.university).toBe('AKTU');
      expect(plan.steps[0].params.course).toBe('B.Tech');
      expect(plan.steps[0].params.year).toBe('2nd Year');
      expect(plan.steps[0].params.category).toBe('PYQ');
      expect(plan.steps[0].params.subject).not.toBe('DSTL');
      expect(plan.steps[0].params.subject).toContain('AKTU B.Tech 2nd Year');

      // Execute and verify honest 404 reporting without fake paths
      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        { onStatusChanged: () => {}, onPlanUpdated: () => {}, onStepUpdated: () => {}, onLogAdded: () => {} },
        mockTabManager
      );
      const record = await engine.executePlan('task-aktu-pyq', plan);
      expect(record.status).toBe('completed');
      expect(record.resultSummary).toContain('Notes Gallery search completed. No local files found');
      expect(record.resultSummary).toContain('AKTU B.Tech 2nd Year');
      expect(record.resultSummary).not.toContain('DSTL');
    });

    it('7. "ye images ke visual matched find kro" analyzes image and executes visual matching in browser', async () => {
      const goal = 'ye images ke visual matched find kro';
      const plan = await adapter.generatePlan(goal, toolRegistry.getAllTools(), {
        attachedImage: {
          name: 'mountain_landscape.jpg',
          dataUrl: 'data:image/jpeg;base64,mockjpg',
          path: 'C:\\Users\\Prince Mishra\\Desktop\\mountain_landscape.jpg',
          size: 102400,
        },
      });

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[0].tool).toBe('browser_visual_match');
      expect(plan.steps[0].params.imageName).toBe('mountain_landscape.jpg');
      expect(plan.steps[1].tool).toBe('browser_navigate');
      expect(plan.steps[1].params.url).toContain('google.com/search?tbm=isch');

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        { onStatusChanged: () => {}, onPlanUpdated: () => {}, onStepUpdated: () => {}, onLogAdded: () => {} },
        mockTabManager
      );
      const record = await engine.executePlan('task-visual-match', plan);
      expect(record.status).toBe('completed');
      expect(record.resultSummary).toContain('mountain_landscape');
      expect(record.resultSummary.toLowerCase()).toContain('matching images');
    });

    it('8. YouTube playback verification detects ads and reports advertisement is currently playing', async () => {
      const youtubeTool = toolRegistry.getTool('browser_youtube_play');
      expect(youtubeTool).toBeDefined();

      let evalCount = 0;
      const mockAdContext = {
        browserService: {
          navigate: async () => ({ status: 200 }),
          getPage: () => ({
            waitForSelector: async () => {},
            evaluate: async () => {
              evalCount++;
              if (evalCount === 1) {
                return { href: 'https://www.youtube.com/watch?v=mockSongId', title: 'Bhool Diya Tujhe - Official Video' };
              }
              return {
                hasAd: true,
                paused: false,
                currentTime: 3,
              };
            },
          }),
        },
        tabManager: mockTabManager,
        emitLog: () => {},
      };

      const result = await youtubeTool?.execute({ query: 'bhul diya tujhe song' }, mockAdContext as any);
      expect(result.success).toBe(true);
      expect(result.data.adPlaying).toBe(true);
      expect(result.data.playing).toBe(false);
      expect(result.data.conclusion).toContain('advertisement is currently playing');
      expect(result.data.conclusion).toContain('has not yet started');
    });
  });

  // =========================================================================
  // Prompt 11 Verification Suite: Question Answering, Generic Navigation & Voice
  // =========================================================================
  describe('Prompt 11: AI Agent QA, Dynamic Navigation, Multi-Step Tasks & Voice', () => {
    it('1. Answers simple mathematical question "1+1 kitna hota hai?" directly without generic introduction', async () => {
      const plan = await adapter.generatePlan('1+1 kitna hota hai?', toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/1\s*\+\s*1\s*=\s*2/i);
      expect(plan.summary).not.toContain('I am AdaL Nexus, your intelligent browser assistant');
      expect(plan.summary).not.toContain('AdaL Nexus aapka intelligent browser agent hai');
    });

    it('2. Answers general conceptual question "What is artificial intelligence?" directly with thorough explanation', async () => {
      const plan = await adapter.generatePlan('What is artificial intelligence?', toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/branch of computer science|machine learning|human intelligence/i);
      expect(plan.summary).not.toContain('I am AdaL Nexus, your intelligent autonomous browser assistant');
    });

    it('3. Answers technical question "Explain JavaScript promises." with states, syntax, and async/await', async () => {
      const plan = await adapter.generatePlan('Explain JavaScript promises.', toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/promise/i);
      expect(plan.summary).toMatch(/pending|fulfilled|rejected/i);
      expect(plan.summary).not.toContain('I am AdaL Nexus, your intelligent browser assistant');
    });

    it('4. Answers factual question "What is the capital of India?" with New Delhi', async () => {
      const plan = await adapter.generatePlan('What is the capital of India?', toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('chat_response');
      expect(plan.summary).toMatch(/New Delhi/i);
      expect(plan.summary).not.toContain('I am AdaL Nexus, your intelligent browser assistant');
    });

    it('5. "WhatsApp Web kholo bhai." navigates visible browser tab to https://web.whatsapp.com', async () => {
      const plan = await adapter.generatePlan('WhatsApp Web kholo bhai.', toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://web.whatsapp.com');
      expect(plan.steps[0].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            approvalManager.resolveApproval(req.id, true);
          },
        },
        mockTabManager
      );
      const record = await engine.executePlan('task-wa-nav', plan);
      expect(record.status).toBe('completed');
      expect(mockTabManager.navigatedUrl).toBe('https://web.whatsapp.com');
    });

    it('6. "Open the official AKTU website." navigates visible browser tab to https://aktu.ac.in', async () => {
      const plan = await adapter.generatePlan('Open the official AKTU website.', toolRegistry.getAllTools());
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://aktu.ac.in');
      expect(plan.steps[0].params.openInTab).toBe(true);

      const engine = new ExecutionEngine(
        toolRegistry,
        mockBrowserService,
        artifactService,
        approvalManager,
        verificationEngine,
        mockDb,
        mockWs,
        {
          onStatusChanged: () => {},
          onPlanUpdated: () => {},
          onStepUpdated: () => {},
          onLogAdded: () => {},
          onApprovalRequested: (req) => {
            approvalManager.resolveApproval(req.id, true);
          },
        },
        mockTabManager
      );
      await engine.executePlan('task-aktu-nav', plan);
      expect(mockTabManager.navigatedUrl).toBe('https://aktu.ac.in');
    });

    it('7. Navigates arbitrary websites dynamically (e.g. "Open Netflix.", "Cricbuzz kholo")', async () => {
      const netflixPlan = await adapter.generatePlan('Open Netflix.', toolRegistry.getAllTools());
      expect(netflixPlan.steps[0].params.url).toBe('https://www.netflix.com');
      expect(netflixPlan.steps[0].params.openInTab).toBe(true);

      const cricbuzzPlan = await adapter.generatePlan('Cricbuzz kholo', toolRegistry.getAllTools());
      expect(cricbuzzPlan.steps[0].params.url).toBe('https://www.cricbuzz.com');
      expect(cricbuzzPlan.steps[0].params.openInTab).toBe(true);
    });

    it('8. Multi-step website research task "AKTU ki official website kholo aur previous year question papers find karo" plans multi-step execution', async () => {
      const plan = await adapter.generatePlan(
        'AKTU ki official website kholo aur previous year question papers find karo',
        toolRegistry.getAllTools()
      );
      expect(plan.steps.length).toBeGreaterThanOrEqual(2);
      expect(plan.steps[0].tool).toBe('browser_navigate');
      expect(plan.steps[0].params.url).toBe('https://aktu.ac.in');
      expect(plan.steps[0].params.openInTab).toBe(true);
      expect(plan.steps[1].tool).toBe('browser_read_page');
    });
  });
});
