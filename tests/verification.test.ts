import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { VerificationEngine } from '../src/main/agent/verification/verification-engine';
import { ArtifactService } from '../src/main/services/artifact-service';
import type { ExecutionPlan } from '../src/shared/types';

describe('VerificationEngine Deterministic Auditing', () => {
  const testArtifactDir = path.resolve(__dirname, 'temp_artifacts');
  let artifactService: ArtifactService;
  let verificationEngine: VerificationEngine;

  beforeEach(() => {
    if (!fs.existsSync(testArtifactDir)) {
      fs.mkdirSync(testArtifactDir, { recursive: true });
    }
    artifactService = new ArtifactService(testArtifactDir);
    verificationEngine = new VerificationEngine({ artifactService });
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testArtifactDir)) {
        fs.rmSync(testArtifactDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('verifies valid 5-startup CSV with status VERIFIED', async () => {
    const validRows = [
      { company_name: 'Anthropic', product: 'Claude', pricing: '$20/mo', source_url: 'https://anthropic.com' },
      { company_name: 'Perplexity AI', product: 'Search Engine', pricing: '$20/mo', source_url: 'https://perplexity.ai' },
      { company_name: 'Mistral AI', product: 'Mistral Large', pricing: 'usage-based', source_url: 'https://mistral.ai' },
      { company_name: 'Cohere', product: 'Command R', pricing: 'unknown', source_url: 'https://cohere.com' },
      { company_name: 'Cursor', product: 'Editor', pricing: '$20/mo', source_url: 'https://cursor.com' },
    ];

    const headers = ['company_name', 'product', 'pricing', 'source_url'];
    await artifactService.writeCsv('startups.csv', headers, validRows);

    const plan: ExecutionPlan = {
      goal: 'Research 5 AI startups and verify CSV',
      summary: 'Task summary',
      createdAt: Date.now(),
      steps: [
        {
          id: 'step-1',
          order: 1,
          description: 'Verify CSV',
          tool: 'verify_csv_artifact',
          params: { path: 'startups.csv', requiredRows: 5 },
          status: 'completed',
        },
      ],
    };

    const report = await verificationEngine.verifyTask('test-task-1', plan, new Map());

    expect(report.status).toBe('VERIFIED');
    expect(report.assertions.every((a) => a.passed)).toBe(true);
    expect(report.artifactsChecked.length).toBeGreaterThan(0);
    expect(report.summary).toContain('VERIFIED: All');
  });

  it('fails verification when CSV file is missing (status FAILED)', async () => {
    const plan: ExecutionPlan = {
      goal: 'Research startups',
      summary: 'Missing artifact test',
      createdAt: Date.now(),
      steps: [
        {
          id: 'step-1',
          order: 1,
          description: 'Save CSV',
          tool: 'file_create_csv',
          params: { path: 'non_existent.csv' },
          status: 'completed',
        },
      ],
    };

    const report = await verificationEngine.verifyTask('test-task-2', plan, new Map());

    expect(report.status).toBe('FAILED');
    const existAssertion = report.assertions.find((a) => a.id === 'assert-artifact-exists');
    expect(existAssertion?.passed).toBe(false);
  });

  it('fails verification when CSV has fewer rows than required', async () => {
    const insufficientRows = [
      { company_name: 'Anthropic', product: 'Claude', pricing: '$20/mo', source_url: 'https://anthropic.com' },
      { company_name: 'Mistral AI', product: 'Mistral Large', pricing: 'usage-based', source_url: 'https://mistral.ai' },
    ];

    const headers = ['company_name', 'product', 'pricing', 'source_url'];
    await artifactService.writeCsv('short.csv', headers, insufficientRows);

    const plan: ExecutionPlan = {
      goal: 'Research 5 startups',
      summary: 'Short rows test',
      createdAt: Date.now(),
      steps: [
        {
          id: 'step-1',
          order: 1,
          description: 'Check CSV',
          tool: 'verify_csv_artifact',
          params: { path: 'short.csv', requiredRows: 5 },
          status: 'completed',
        },
      ],
    };

    const report = await verificationEngine.verifyTask('test-task-3', plan, new Map());

    expect(report.status).toBe('FAILED');
    const rowAssertion = report.assertions.find((a) => a.id === 'assert-row-count');
    expect(rowAssertion?.passed).toBe(false);
  });

  it('fails verification when required columns are missing', async () => {
    const badSchemaRows = [
      { name: 'Anthropic', tool: 'Claude' },
      { name: 'Mistral', tool: 'Large' },
    ];

    await artifactService.writeCsv('bad_cols.csv', ['name', 'tool'], badSchemaRows);

    const plan: ExecutionPlan = {
      goal: 'Research 5 startups',
      summary: 'Missing columns test',
      createdAt: Date.now(),
      steps: [
        {
          id: 'step-1',
          order: 1,
          description: 'Check CSV',
          tool: 'verify_csv_artifact',
          params: { path: 'bad_cols.csv', requiredRows: 2 },
          status: 'completed',
        },
      ],
    };

    const report = await verificationEngine.verifyTask('test-task-4', plan, new Map());

    expect(report.status).toBe('FAILED');
    const headerAssertion = report.assertions.find((a) => a.id === 'assert-csv-headers');
    expect(headerAssertion?.passed).toBe(false);
  });
});
