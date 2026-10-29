import type { PlanStep, ExecutionPlan, ApprovalRequest, VerificationStatus, VerificationReport } from '../../shared/types';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON schema or description
  requiresApproval?: boolean;
  consequential?: boolean;
  execute: (params: any, context: ExecutionContext) => Promise<ToolExecutionResult>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  evidence?: any;
}

export interface ExecutionContext {
  taskId: string;
  stepId: string;
  browserService: any;
  artifactService: any;
  tabManager?: any;
  accumulatedFindings?: any[];
  accumulatedConclusion?: string;
  emitLog: (level: 'info' | 'warn' | 'error' | 'success' | 'action', title: string, details?: string, data?: any) => void;
  checkCancelled: () => boolean;
}

export interface VerificationRule {
  id: string;
  name: string;
  description: string;
  check: (context: VerificationContext) => Promise<{
    passed: boolean;
    expected: string;
    actual: string;
    evidence?: any;
  }>;
}

export interface VerificationContext {
  taskId: string;
  plan: ExecutionPlan;
  stepResults: Map<string, ToolExecutionResult>;
  artifactService: any;
  browserService: any;
}
