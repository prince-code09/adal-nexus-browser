import { describe, it, expect } from 'vitest';
import {
  validateExecutionPlan,
  validateStartupDataset,
  PlanStepSchema,
  StartupRecordSchema,
} from '../src/main/agent/validation';

describe('Plan and Step Validation Schemas', () => {
  it('validates a correct PlanStep', () => {
    const validStep = {
      id: 'step-1',
      order: 1,
      description: 'Navigate to target URL',
      tool: 'browser_navigate',
      params: { url: 'https://example.com' },
      status: 'pending',
    };

    const parsed = PlanStepSchema.safeParse(validStep);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tool).toBe('browser_navigate');
      expect(parsed.data.requiresApproval).toBe(false);
    }
  });

  it('rejects a PlanStep with negative order', () => {
    const invalidStep = {
      id: 'step-1',
      order: -1,
      description: 'Invalid order',
      tool: 'browser_navigate',
      params: {},
    };

    const parsed = PlanStepSchema.safeParse(invalidStep);
    expect(parsed.success).toBe(false);
  });

  it('validates a complete ExecutionPlan', () => {
    const validPlan = {
      goal: 'Research 5 AI startups and verify CSV',
      summary: 'Automated 4-step research workflow',
      createdAt: Date.now(),
      steps: [
        {
          id: 's-1',
          order: 1,
          description: 'Navigate to research portal',
          tool: 'browser_navigate',
          params: { url: 'https://anthropic.com' },
          status: 'pending',
        },
      ],
    };

    const result = validateExecutionPlan(validPlan);
    expect(result.success).toBe(true);
  });

  it('rejects an empty plan with no steps', () => {
    const emptyPlan = {
      goal: 'Empty',
      summary: 'No steps',
      steps: [],
    };

    const result = validateExecutionPlan(emptyPlan);
    expect(result.success).toBe(false);
  });
});

describe('Startup Dataset & Citation Validation', () => {
  it('accepts valid startup records with citations and prices', () => {
    const record = {
      company_name: 'Anthropic',
      product: 'Claude 3.5 Sonnet',
      pricing: '$20/month',
      source_url: 'https://anthropic.com',
    };

    const parsed = StartupRecordSchema.safeParse(record);
    expect(parsed.success).toBe(true);
  });

  it('accepts honest unknown pricing values', () => {
    const record = {
      company_name: 'Stealth AI',
      product: 'Foundation Models',
      pricing: 'unknown',
      source_url: 'https://example.com',
    };

    const parsed = StartupRecordSchema.safeParse(record);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid or non-URL citations', () => {
    const record = {
      company_name: 'Fake AI',
      product: 'Fake Tool',
      pricing: 'Free',
      source_url: 'not-a-valid-url',
    };

    const parsed = StartupRecordSchema.safeParse(record);
    expect(parsed.success).toBe(false);
  });

  it('validates minimum 5 startups in dataset', () => {
    const dataset = [
      { company_name: 'A', product: 'P1', pricing: 'Free', source_url: 'https://a.com' },
      { company_name: 'B', product: 'P2', pricing: 'unknown', source_url: 'https://b.com' },
      { company_name: 'C', product: 'P3', pricing: '$10', source_url: 'https://c.com' },
      { company_name: 'D', product: 'P4', pricing: 'unknown', source_url: 'https://d.com' },
      { company_name: 'E', product: 'P5', pricing: '$50', source_url: 'https://e.com' },
    ];

    const result = validateStartupDataset(dataset);
    expect(result.success).toBe(true);
  });

  it('rejects dataset with fewer than 5 startups', () => {
    const dataset = [
      { company_name: 'A', product: 'P1', pricing: 'Free', source_url: 'https://a.com' },
      { company_name: 'B', product: 'P2', pricing: 'unknown', source_url: 'https://b.com' },
    ];

    const result = validateStartupDataset(dataset);
    expect(result.success).toBe(false);
  });
});
