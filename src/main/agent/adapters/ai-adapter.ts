import type { ExecutionPlan, AttachedImage } from '../../../shared/types';
import type { ToolDefinition } from '../types';

export interface TaskContext {
  previousQueries?: string[];
  previousGoal?: string;
  attachedImage?: AttachedImage;
}

export interface AIProviderAdapter {
  providerName: string;
  generatePlan(goal: string, tools: ToolDefinition[], context?: TaskContext): Promise<ExecutionPlan>;
}
