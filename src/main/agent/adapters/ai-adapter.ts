import type { ExecutionPlan } from '../../../shared/types';
import type { ToolDefinition } from '../types';

export interface AIProviderAdapter {
  providerName: string;
  generatePlan(goal: string, tools: ToolDefinition[]): Promise<ExecutionPlan>;
}
