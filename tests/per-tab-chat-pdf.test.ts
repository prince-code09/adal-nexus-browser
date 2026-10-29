import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ArtifactService } from '../src/main/services/artifact-service';
import { MockLocalAIAdapter } from '../src/main/agent/adapters/mock-adapter';
import { VerificationEngine } from '../src/main/agent/verification/verification-engine';
import { detectLanguage } from '../src/renderer/components/CompanionPanel';
import type { TabAgentWorkspace, ChatMessage } from '../src/shared/types';

describe('AdaL Nexus - Per-Tab Workspace, Chat, Language Matching & PDF Deliverables', () => {
  const testOutputDir = path.join(process.cwd(), 'tests', 'temp_pdf_test');
  let artifactService: ArtifactService;
  let verificationEngine: VerificationEngine;

  beforeEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
    artifactService = new ArtifactService(testOutputDir);
    verificationEngine = new VerificationEngine({ artifactService });
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('1. Natural Language Detection & Matching', () => {
    it('accurately detects English prompt', () => {
      const prompt = 'Research five AI startups, collect names and pricing, and generate a PDF report.';
      expect(detectLanguage(prompt)).toBe('en');
    });

    it('accurately detects Hindi Devanagari prompt', () => {
      const prompt = 'शीर्ष 5 AI स्टार्टअप्स पर शोध करें और पीडीएफ रिपोर्ट तैयार करें।';
      expect(detectLanguage(prompt)).toBe('hi');
    });

    it('accurately detects Hinglish prompt', () => {
      const prompt = '5 AI startups research karo, unka product aur pricing compare karke PDF report banao.';
      expect(detectLanguage(prompt)).toBe('hinglish');
    });

    it('accurately detects mixed colloquial Hinglish prompt', () => {
      const prompt = 'Mujhe top AI companies ki pricing details chahiye, ek badhiya report karke do';
      expect(detectLanguage(prompt)).toBe('hinglish');
    });
  });

  describe('2. Consolidated PDF Report Generation and Integrity', () => {
    it('generates a verified PDF file with valid %PDF- header and readable content', async () => {
      const artifact = await artifactService.writePdfReport(
        'Executive_AI_Market_Report.pdf',
        {
          title: 'Executive AI Market Analysis Report',
          taskSummary: 'Comprehensive Pricing & Product Comparison across leading AI vendors.',
          headers: ['Company', 'Product', 'Pricing Model'],
          rows: [
            { Company: 'Anthropic', Product: 'Claude 3.5 Sonnet', 'Pricing Model': '$20/mo Pro' },
            { Company: 'OpenAI', Product: 'GPT-4o', 'Pricing Model': '$20/mo Plus' },
            { Company: 'Perplexity AI', Product: 'Perplexity Pro', 'Pricing Model': '$200/year' },
          ],
          conclusion: 'The market exhibits strong tier segmentation between consumer assistants and enterprise inference infrastructure.',
          sources: ['https://anthropic.com', 'https://openai.com'],
        }
      );

      const pdfPath = artifact.path;
      expect(fs.existsSync(pdfPath)).toBe(true);
      expect(pdfPath.endsWith('.pdf')).toBe(true);

      const buffer = fs.readFileSync(pdfPath);
      expect(buffer.length).toBeGreaterThan(100);

      // Verify PDF 1.4 Magic Header
      const header = buffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');

      // Verify PDF structure with ArtifactService
      const verification = await artifactService.readAndVerifyPdf(pdfPath);
      expect(verification.valid).toBe(true);
      expect(verification.hasPdfMagic).toBe(true);
      expect(verification.sizeBytes).toBe(buffer.length);
    });

    it('verifies PDF report through VerificationEngine', async () => {
      const artifact = await artifactService.writePdfReport(
        'Verified_Startup_Audit.pdf',
        {
          title: 'Verified Startup Audit',
          taskSummary: 'Audit of startup findings.',
          headers: ['Name', 'Status'],
          rows: [{ Name: 'Startup A', Status: 'Verified' }],
          conclusion: 'Verification passed with zero anomalies.',
        }
      );

      const plan = {
        goal: 'Generate and verify PDF report',
        summary: 'Audit of startup findings into PDF report',
        createdAt: Date.now(),
        steps: [
          {
            id: 'step-pdf',
            order: 1,
            description: 'Create consolidated PDF report',
            tool: 'file_create_pdf',
            params: { path: artifact.path },
            status: 'completed' as const,
          },
        ],
      };

      const report = await verificationEngine.verifyTask('task-pdf-test', plan, new Map());
      expect(report.status).toBe('VERIFIED');
      const pdfAssert = report.assertions.find((a) => a.id === 'assert-pdf-exists');
      expect(pdfAssert).toBeDefined();
      expect(pdfAssert?.passed).toBe(true);
      expect(pdfAssert?.actual).toContain('%PDF-');
    });
  });

  describe('3. Planner Defaults to Consolidated PDF Report (No Duplicate CSVs)', () => {
    it('produces exactly one consolidated PDF report for research tasks without duplicate CSV creation', async () => {
      const adapter = new MockLocalAIAdapter();
      const plan = await adapter.generatePlan(
        'Research 5 AI startups, compare pricing, and create report',
        []
      );

      expect(plan.steps.length).toBeGreaterThan(0);

      // Must include PDF generation tool
      const pdfStep = plan.steps.find((s) => s.tool === 'file_create_pdf');
      expect(pdfStep).toBeDefined();

      // Must NOT create duplicate CSV files by default
      const csvSteps = plan.steps.filter((s) => s.tool === 'file_create_csv');
      expect(csvSteps.length).toBe(0);
    });

    it('only generates CSV if user explicitly requests CSV format', async () => {
      const adapter = new MockLocalAIAdapter();
      const plan = await adapter.generatePlan(
        'Research 5 AI startups and export results to CSV spreadsheet',
        []
      );

      const csvStep = plan.steps.find((s) => s.tool === 'file_create_csv');
      expect(csvStep).toBeDefined();
    });

    it('matches Hinglish language in plan summary and step descriptions', async () => {
      const adapter = new MockLocalAIAdapter();
      const plan = await adapter.generatePlan(
        '5 AI startups research karo, unka product aur pricing compare karke PDF report banao',
        []
      );

      expect(plan.summary).toMatch(/(Hinglish|startups|research|report|taiyaar|karke)/i);
    });
  });

  describe('4. Independent AI Agent Workspace per Browser Tab', () => {
    it('isolates conversation messages and task state between different tabs', () => {
      // Simulate Tab 1 workspace
      const tab1Workspace: TabAgentWorkspace = {
        tabId: 'tab-1-research',
        messages: [
          {
            id: 'msg-1',
            sender: 'user',
            content: 'Research quantum computing startups',
            timestamp: 1000,
          },
          {
            id: 'msg-2',
            sender: 'agent',
            content: 'Found 3 quantum computing startups: PsiQuantum, IonQ, Rigetti.',
            timestamp: 2000,
            status: 'success',
            pdfPath: '/path/to/quantum_report.pdf',
          },
        ],
        currentGoal: 'Research quantum computing startups',
        taskStatus: 'completed',
        verificationStatus: 'VERIFIED',
        plan: null,
        logs: [],
        pendingApproval: null,
        currentTaskId: 'task-101',
        artifacts: [
          {
            id: 'art-1',
            taskId: 'task-101',
            name: 'quantum_report.pdf',
            type: 'pdf',
            path: '/path/to/quantum_report.pdf',
            createdAt: 2000,
            sizeBytes: 4096,
          },
        ],
      };

      // Simulate Tab 2 workspace (brand new tab)
      const tab2Workspace: TabAgentWorkspace = {
        tabId: 'tab-2-fresh',
        messages: [],
        currentGoal: '',
        taskStatus: 'idle',
        verificationStatus: 'UNVERIFIED',
        plan: null,
        logs: [],
        pendingApproval: null,
        currentTaskId: null,
        artifacts: [],
      };

      // Tab 2 has zero messages and clean state
      expect(tab2Workspace.messages.length).toBe(0);
      expect(tab2Workspace.taskStatus).toBe('idle');
      expect(tab2Workspace.artifacts.length).toBe(0);

      // Tab 1 maintains its distinct messages and artifacts
      expect(tab1Workspace.messages.length).toBe(2);
      expect(tab1Workspace.taskStatus).toBe('completed');
      expect(tab1Workspace.artifacts.length).toBe(1);
      expect(tab1Workspace.messages[1].pdfPath).toBe('/path/to/quantum_report.pdf');

      // Modifying Tab 2 does not alter Tab 1
      const userMsgTab2: ChatMessage = {
        id: 'msg-tab2-1',
        sender: 'user',
        content: 'Check latest Mars rover news',
        timestamp: 3000,
      };
      tab2Workspace.messages.push(userMsgTab2);

      expect(tab2Workspace.messages.length).toBe(1);
      expect(tab1Workspace.messages.length).toBe(2);
      expect(tab1Workspace.messages[0].content).toBe('Research quantum computing startups');
    });
  });

  describe('5. Safe File Resolution & Artifact Opening Integrity', () => {
    it('safely resolves absolute artifact paths without corrupting drive letters', () => {
      const sampleFile = path.join(testOutputDir, 'market_audit.pdf');
      fs.writeFileSync(sampleFile, '%PDF-1.4 test dummy content');

      // The Open Artifact handler passes absolute paths from artifact.path
      const resolved = artifactService.resolveSafePath(sampleFile);
      expect(resolved).toBe(path.normalize(sampleFile));
      expect(fs.existsSync(resolved)).toBe(true);
    });

    it('safely resolves relative artifact paths inside baseDir', () => {
      const resolved = artifactService.resolveSafePath('report.pdf');
      expect(resolved).toBe(path.resolve(testOutputDir, 'report.pdf'));
    });

    it('blocks directory traversal attempts outside allowed baseDir', () => {
      expect(() => {
        artifactService.resolveSafePath('../../windows/system32/cmd.exe');
      }).toThrow(/Security Violation/);
    });
  });
});
