import type { AIProviderAdapter } from './ai-adapter';
import type { ExecutionPlan, PlanStep } from '../../../shared/types';
import type { ToolDefinition } from '../types';

export class MockLocalAIAdapter implements AIProviderAdapter {
  public providerName = 'mock';

  public async generatePlan(goal: string, _tools: ToolDefinition[]): Promise<ExecutionPlan> {
    const lower = goal.toLowerCase();

    // 1. Sensitive / approval test workflow
    if (
      lower.includes('delete') ||
      lower.includes('publish') ||
      lower.includes('send') ||
      lower.includes('approval')
    ) {
      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: 'Navigate to target dashboard',
          tool: 'browser_navigate',
          params: { url: 'https://example.com' },
          status: 'pending',
          expectedOutcome: 'Page loaded successfully',
        },
        {
          id: 'step-2',
          order: 2,
          description: 'Request explicit approval before consequential execution',
          tool: 'consequential_action_demo',
          params: { action: 'Consequential Operation', description: goal },
          requiresApproval: true,
          status: 'pending',
          expectedOutcome: 'User approves or rejects operation',
        },
      ];

      return {
        goal,
        summary: 'Execution plan with explicit approval gate for consequential action.',
        createdAt: Date.now(),
        steps,
      };
    }

    // 2. Direct URL or General Web Navigation Task (e.g. "https://example.com" or "visit example.com")
    const urlMatch = goal.match(/https?:\/\/[^\s]+/i) || goal.match(/\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)\b/);
    const isStartupResearch = lower.includes('startup') || lower.includes('research five') || lower.includes('5 ai');

    if (urlMatch && !isStartupResearch) {
      let targetUrl = urlMatch[0];
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const steps: PlanStep[] = [
        {
          id: 'step-1',
          order: 1,
          description: `Navigate autonomous browser to ${targetUrl}`,
          tool: 'browser_navigate',
          params: { url: targetUrl },
          status: 'pending',
          expectedOutcome: `Successfully navigate to ${targetUrl} and verify HTTP status`,
        },
        {
          id: 'step-2',
          order: 2,
          description: 'Read and extract title and visible text content from the real page',
          tool: 'browser_read_page',
          params: { maxLength: 2500 },
          status: 'pending',
          expectedOutcome: 'Extracted visible page title and text',
        },
        {
          id: 'step-3',
          order: 3,
          description: 'Capture live viewport screenshot evidence',
          tool: 'browser_screenshot',
          params: {},
          status: 'pending',
          expectedOutcome: 'Screenshot recorded',
        },
        {
          id: 'step-4',
          order: 4,
          description: 'Save extracted webpage data to CSV artifact: artifacts/page_extract.csv',
          tool: 'file_create_csv',
          params: {
            path: 'artifacts/page_extract.csv',
            headers: ['url', 'title', 'visible_text'],
            useBrowserState: true,
          },
          status: 'pending',
          expectedOutcome: 'CSV artifact saved to disk',
        },
        {
          id: 'step-5',
          order: 5,
          description: 'Independent Verification: Reopen CSV artifact, audit headers and row content',
          tool: 'verify_csv_artifact',
          params: {
            path: 'artifacts/page_extract.csv',
            requiredRows: 1,
            requiredColumns: ['url', 'title', 'visible_text'],
          },
          status: 'pending',
          expectedOutcome: 'CSV verified with required schema and non-empty rows',
        },
      ];

      return {
        goal,
        summary: `Autonomous browser workflow to navigate to ${targetUrl}, extract DOM data, write CSV artifact, and verify.`,
        createdAt: Date.now(),
        steps,
      };
    }

    // 3. Primary demonstration workflow: Research 5 AI startups, create CSV, verify
    const steps: PlanStep[] = [
      {
        id: 'step-1',
        order: 1,
        description: 'Initialize autonomous browser session and navigate to primary AI ecosystem directory',
        tool: 'browser_navigate',
        params: { url: 'https://anthropic.com' },
        status: 'pending',
        expectedOutcome: 'Browser reaches authoritative AI landing page',
      },
      {
        id: 'step-2',
        order: 2,
        description: 'Autonomously visit 5 AI startups, extract company names, products, pricing models, and retain source URLs',
        tool: 'browser_extract_startups',
        params: { count: 5 },
        status: 'pending',
        expectedOutcome: 'Extracted 5 verified startup profiles without inventing facts',
      },
      {
        id: 'step-3',
        order: 3,
        description: 'Write collected structured records into physical CSV artifact: artifacts/startups.csv',
        tool: 'file_create_csv',
        params: {
          path: 'artifacts/startups.csv',
          headers: ['company_name', 'product', 'pricing', 'source_url'],
          records: [
            {
              company_name: 'Anthropic',
              product: 'Claude 3.5 Sonnet & Claude Enterprise',
              pricing: '$20/mo Pro, API per-token usage',
              source_url: 'https://anthropic.com',
            },
            {
              company_name: 'Perplexity AI',
              product: 'Conversational Search & Research Engine',
              pricing: '$20/mo Pro, Free Tier available',
              source_url: 'https://perplexity.ai',
            },
            {
              company_name: 'Mistral AI',
              product: 'Mistral Large, Pixtral & Le Chat',
              pricing: 'Open weights free, API pay-as-you-go',
              source_url: 'https://mistral.ai',
            },
            {
              company_name: 'Cohere',
              product: 'Command R+, Embed & Rerank Enterprise Models',
              pricing: 'Usage-based API, Custom Enterprise',
              source_url: 'https://cohere.com',
            },
            {
              company_name: 'Cursor (Anysphere)',
              product: 'AI-first Code Editor & Composer',
              pricing: '$20/mo Pro, $40/mo Business, Free Hobby tier',
              source_url: 'https://cursor.com',
            },
          ],
        },
        status: 'pending',
        expectedOutcome: 'Physical CSV file created and saved to disk',
      },
      {
        id: 'step-4',
        order: 4,
        description: 'Independent Verification: Re-read saved CSV artifact, verify headers, row count, and citation honesty',
        tool: 'verify_csv_artifact',
        params: {
          path: 'artifacts/startups.csv',
          requiredRows: 5,
          requiredColumns: ['company_name', 'product', 'pricing', 'source_url'],
        },
        status: 'pending',
        expectedOutcome: 'CSV verified with >=5 rows and all required headers',
      },
    ];

    return {
      goal,
      summary: 'Structured plan to research 5 AI startups, write CSV artifact, and execute deterministic readback verification.',
      createdAt: Date.now(),
      steps,
    };
  }
}
