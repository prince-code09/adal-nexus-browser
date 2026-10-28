import { z } from 'zod';

export const PlanStepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  description: z.string().min(1),
  tool: z.string().min(1),
  params: z.record(z.string(), z.any()).default({}),
  requiresApproval: z.boolean().optional().default(false),
  expectedOutcome: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']).default('pending'),
  result: z.any().optional(),
  error: z.string().optional(),
});

export const ExecutionPlanSchema = z.object({
  goal: z.string().min(1),
  summary: z.string().min(1),
  steps: z.array(PlanStepSchema).min(1),
  createdAt: z.number().default(() => Date.now()),
});

export const ApprovalRequestSchema = z.object({
  id: z.string().min(1),
  stepId: z.string().min(1),
  actionType: z.enum(['send_message', 'publish_content', 'delete_data', 'consequential_action']),
  title: z.string().min(1),
  description: z.string().min(1),
  consequences: z.array(z.string()).min(1),
  parameters: z.record(z.string(), z.any()).default({}),
  timestamp: z.number().default(() => Date.now()),
});

export const VerificationAssertionSchema = z.object({
  id: z.string(),
  name: z.string(),
  expected: z.string(),
  actual: z.string(),
  passed: z.boolean(),
  evidence: z.any().optional(),
});

export const VerificationReportSchema = z.object({
  taskId: z.string(),
  status: z.enum(['VERIFIED', 'FAILED', 'UNVERIFIED']),
  summary: z.string(),
  timestamp: z.number(),
  assertions: z.array(VerificationAssertionSchema),
  artifactsChecked: z.array(z.string()),
  rawEvidence: z.record(z.string(), z.any()).optional(),
});

export const StartupRecordSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  product: z.string().min(1, 'Product description is required'),
  pricing: z.string().min(1, 'Pricing must be recorded or explicitly set to "unknown"'),
  source_url: z.string().url('Source URL must be a valid http or https URL'),
});

export const StartupDatasetSchema = z.array(StartupRecordSchema).min(5, 'At least 5 startups are required');

export function validateExecutionPlan(data: unknown) {
  return ExecutionPlanSchema.safeParse(data);
}

export function validatePlanStep(data: unknown) {
  return PlanStepSchema.safeParse(data);
}

export function validateStartupDataset(data: unknown) {
  return StartupDatasetSchema.safeParse(data);
}
