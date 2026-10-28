import type { ExecutionPlan, AppSettings } from '../../shared/types';
import type { ToolRegistry } from './tools/registry';
import type { AIProviderAdapter } from './adapters/ai-adapter';
import { MockLocalAIAdapter } from './adapters/mock-adapter';
import { GeminiAIAdapter } from './adapters/gemini-adapter';
import { OpenAICompatibleAdapter } from './adapters/openai-adapter';
import { validateExecutionPlan } from './validation';

export class TaskPlanner {
  private toolRegistry: ToolRegistry;
  private settings: AppSettings;
  private mockAdapter: MockLocalAIAdapter;

  constructor(toolRegistry: ToolRegistry, settings: AppSettings) {
    this.toolRegistry = toolRegistry;
    this.settings = settings;
    this.mockAdapter = new MockLocalAIAdapter();
  }

  public updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }

  private getAdapter(): AIProviderAdapter {
    const provider = this.settings.llmProvider;
    const apiKey = this.settings.apiKey;

    if (provider === 'gemini' && apiKey) {
      return new GeminiAIAdapter(apiKey, this.settings.model || 'gemini-1.5-pro-latest');
    }

    if (provider === 'openai' && apiKey) {
      return new OpenAICompatibleAdapter(
        apiKey,
        this.settings.model || 'gpt-4o-mini',
        this.settings.apiBaseUrl || 'https://api.openai.com/v1',
        'openai'
      );
    }

    if (provider === 'custom' && apiKey) {
      return new OpenAICompatibleAdapter(
        apiKey,
        this.settings.model,
        this.settings.apiBaseUrl || 'http://localhost:11434/v1',
        'custom'
      );
    }

    // Default: deterministic, zero-key local planner
    return this.mockAdapter;
  }

  public async createPlan(goal: string): Promise<ExecutionPlan> {
    const adapter = this.getAdapter();
    const availableTools = this.toolRegistry.getAllTools();

    let plan: ExecutionPlan;
    try {
      plan = await adapter.generatePlan(goal, availableTools);
    } catch (err: any) {
      console.warn(`[TaskPlanner] Primary adapter (${adapter.providerName}) failed: ${err.message}. Falling back to deterministic local planner.`);
      plan = await this.mockAdapter.generatePlan(goal, availableTools);
    }

    // Validate plan schema strictly with Zod
    const validation = validateExecutionPlan(plan);
    if (!validation.success) {
      console.warn('[TaskPlanner] Plan validation warning, repairing with local template:', validation.error);
      plan = await this.mockAdapter.generatePlan(goal, availableTools);
    }

    return plan;
  }
}
