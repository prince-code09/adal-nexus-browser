import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { ToolRegistry } from '../src/main/agent/tools/registry';
import { ArtifactService } from '../src/main/services/artifact-service';

describe('ToolRegistry and Execution Sandbox', () => {
  let registry: ToolRegistry;
  const testArtifactDir = path.resolve(__dirname, 'temp_tools_artifacts');
  let artifactService: ArtifactService;

  beforeEach(() => {
    registry = new ToolRegistry();
    if (!fs.existsSync(testArtifactDir)) {
      fs.mkdirSync(testArtifactDir, { recursive: true });
    }
    artifactService = new ArtifactService(testArtifactDir);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testArtifactDir)) {
        fs.rmSync(testArtifactDir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('contains essential browser, file, and verification tools', () => {
    const tools = registry.getAllTools().map((t) => t.name);
    expect(tools).toContain('browser_navigate');
    expect(tools).toContain('browser_read_page');
    expect(tools).toContain('file_create_csv');
    expect(tools).toContain('file_read_csv');
    expect(tools).toContain('verify_csv_artifact');
    expect(tools).toContain('consequential_action_demo');
  });

  it('rejects navigation with non-http/https protocols for security', async () => {
    const mockContext = {
      taskId: 'test-1',
      stepId: 'step-1',
      browserService: {},
      artifactService,
      emitLog: () => {},
      checkCancelled: () => false,
    };

    const res1 = await registry.executeTool(
      'browser_navigate',
      { url: 'file:///etc/passwd' },
      mockContext
    );
    expect(res1.success).toBe(false);
    expect(res1.error).toContain('Only HTTP and HTTPS URLs are permitted');

    const res2 = await registry.executeTool(
      'browser_navigate',
      { url: 'javascript:alert(1)' },
      mockContext
    );
    expect(res2.success).toBe(false);
  });

  it('creates and reads back a CSV artifact securely', async () => {
    const mockContext = {
      taskId: 'test-2',
      stepId: 'step-2',
      browserService: {},
      artifactService,
      emitLog: () => {},
      checkCancelled: () => false,
    };

    const createRes = await registry.executeTool(
      'file_create_csv',
      {
        path: 'tools_test.csv',
        headers: ['company_name', 'product', 'pricing', 'source_url'],
        records: [
          { company_name: 'Alpha', product: 'P1', pricing: 'Free', source_url: 'https://alpha.com' },
        ],
      },
      mockContext
    );

    expect(createRes.success).toBe(true);

    const readRes = await registry.executeTool(
      'file_read_csv',
      { path: 'tools_test.csv' },
      mockContext
    );

    expect(readRes.success).toBe(true);
    expect(readRes.data.rowCount).toBe(1);
    expect(readRes.data.records[0].company_name).toBe('Alpha');
  });

  it('prevents path traversal out of artifacts directory', () => {
    expect(() => {
      artifactService.resolveSafePath('../../windows/system32/cmd.exe');
    }).toThrow(/Security Violation/);
  });

  it('safely handles artifacts path with prefix artifacts/', () => {
    const resolved = artifactService.resolveSafePath('artifacts/test.csv');
    expect(resolved.endsWith('test.csv')).toBe(true);
  });

  it('prevents silent overwrite by resolving non-colliding filename when duplicate exists', async () => {
    const initial = await artifactService.writeCsv('duplicate_test.csv', ['col1'], [{ col1: 'val1' }]);
    expect(fs.existsSync(initial.path)).toBe(true);

    const nonColliding = artifactService.resolveSafeNonCollidingPath('duplicate_test.csv');
    expect(nonColliding).not.toBe(initial.path);
    expect(nonColliding.includes('duplicate_test (1).csv')).toBe(true);
  });
});
