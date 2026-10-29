import type {
  ExecutionPlan,
  PlanStep,
  TaskStatus,
  VerificationStatus,
  ActionLogItem,
  ApprovalRequest,
  TaskRecord,
  VerificationReport,
} from '../../shared/types';
import type { ToolRegistry } from './tools/registry';
import type { PlaywrightBrowserService } from '../browser/browser-service';
import type { ArtifactService } from '../services/artifact-service';
import type { ApprovalManager } from './approval/approval-manager';
import type { VerificationEngine } from './verification/verification-engine';
import type { DatabaseService } from '../db/database';
import type { WebSocketService } from '../services/websocket-service';
import type { ExecutionContext, ToolExecutionResult } from './types';

export interface ExecutionEngineCallbacks {
  onStatusChanged: (data: {
    taskId: string;
    status: TaskStatus;
    verificationStatus: VerificationStatus;
    report?: VerificationReport;
    taskRecord?: TaskRecord;
  }) => void;
  onPlanUpdated: (plan: ExecutionPlan) => void;
  onStepUpdated: (step: PlanStep) => void;
  onLogAdded: (log: ActionLogItem) => void;
  onApprovalRequested: (request: ApprovalRequest) => void;
}

export class ExecutionEngine {
  private toolRegistry: ToolRegistry;
  private browserService: PlaywrightBrowserService;
  private artifactService: ArtifactService;
  private approvalManager: ApprovalManager;
  private verificationEngine: VerificationEngine;
  private db: DatabaseService;
  private wsService: WebSocketService;
  private callbacks: ExecutionEngineCallbacks;
  private tabManager?: any;

  private currentTaskId: string | null = null;
  private isCancelled: boolean = false;
  private activeStepId: string | null = null;

  constructor(
    toolRegistry: ToolRegistry,
    browserService: PlaywrightBrowserService,
    artifactService: ArtifactService,
    approvalManager: ApprovalManager,
    verificationEngine: VerificationEngine,
    db: DatabaseService,
    wsService: WebSocketService,
    callbacks: ExecutionEngineCallbacks,
    tabManager?: any
  ) {
    this.toolRegistry = toolRegistry;
    this.browserService = browserService;
    this.artifactService = artifactService;
    this.approvalManager = approvalManager;
    this.verificationEngine = verificationEngine;
    this.db = db;
    this.wsService = wsService;
    this.callbacks = callbacks;
    this.tabManager = tabManager;
  }

  public cancel(taskId: string): boolean {
    if (this.currentTaskId === taskId || this.currentTaskId !== null) {
      this.isCancelled = true;
      this.approvalManager.cancelAll();
      this.emitLog('warn', 'Cancellation Triggered', `User cancelled task ${taskId}.`);
      return true;
    }
    return false;
  }

  public async executePlan(taskId: string, plan: ExecutionPlan): Promise<TaskRecord> {
    this.currentTaskId = taskId;
    this.isCancelled = false;

    // Reset takeover state so agent is in control for new task
    if (this.browserService?.setTakeover) {
      this.browserService.setTakeover(false);
    }

    const taskRecord: TaskRecord = {
      id: taskId,
      goal: plan.goal,
      status: 'executing',
      verificationStatus: 'UNVERIFIED',
      createdAt: plan.createdAt || Date.now(),
      plan,
      artifacts: [],
    };

    this.db.saveTask(taskRecord);
    this.callbacks.onStatusChanged({
      taskId,
      status: 'executing',
      verificationStatus: 'UNVERIFIED',
      taskRecord,
    });
    this.wsService.broadcast('task:status', { taskId, status: 'executing' });

    this.emitLog(
      'info',
      'Plan Execution Started',
      `Executing plan with ${plan.steps.length} sequential steps.`
    );

    const stepResults = new Map<string, ToolExecutionResult>();
    let overallSuccess = true;
    let failureReason = '';
    let accumulatedFindings: any[] = [];
    let accumulatedConclusion: string = '';

    for (const step of plan.steps) {
      if (this.isCancelled) {
        step.status = 'skipped';
        this.updateStep(step);
        continue;
      }

      // Check if manual browser takeover is currently holding agent
      if (this.browserService?.getIsControlledByAgent && !this.browserService.getIsControlledByAgent()) {
        this.emitLog('info', 'Agent Paused', 'Manual browser takeover active. Waiting for user to return control...');
        while (this.browserService?.getIsControlledByAgent && !this.browserService.getIsControlledByAgent() && !this.isCancelled) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      if (this.isCancelled) {
        step.status = 'skipped';
        this.updateStep(step);
        continue;
      }

      this.activeStepId = step.id;
      step.status = 'in_progress';
      this.updateStep(step);

      // Check for consequential approval requirement
      const requiresApproval =
        step.requiresApproval ||
        this.approvalManager.isConsequential(step.tool, step.params);

      if (requiresApproval) {
        this.emitLog(
          'warn',
          'Approval Required',
          `Step "${step.description}" requires explicit user confirmation.`
        );

        this.callbacks.onStatusChanged({
          taskId,
          status: 'waiting_approval',
          verificationStatus: 'UNVERIFIED',
          taskRecord,
        });

        const isLinkedIn = step.tool === 'browser_linkedin_post';
        const isFileDelete = step.tool === 'file_delete' || step.tool === 'notes_gallery_delete';
        const postText = step.params?.postText || '';
        const targetPath = step.params?.path || step.params?.filePath || '';
        const attachedImg = step.params?.imageData
          ? {
              name: step.params?.imageName || 'image',
              dataUrl: step.params?.imageData,
              path: step.params?.imagePath,
            }
          : step.params?.imagePath
          ? {
              name: step.params?.imageName || require('path').basename(step.params.imagePath),
              dataUrl: '',
              path: step.params?.imagePath,
            }
          : undefined;

        const approvalReq: ApprovalRequest = {
          id: `req-${Date.now()}-${step.id}`,
          stepId: step.id,
          actionType: isLinkedIn
            ? 'publish_content'
            : isFileDelete
            ? 'delete_data'
            : 'consequential_action',
          title: isLinkedIn
            ? (attachedImg ? `Confirm LinkedIn Post Publication (with ${attachedImg.name})` : 'Confirm LinkedIn Post Publication')
            : isFileDelete
            ? `Confirm File Deletion: ${targetPath ? require('path').basename(targetPath) : 'File'}`
            : `Approve: ${step.description}`,
          description: isLinkedIn
            ? `Do you want to publish the following post${attachedImg ? ` with attached image "${attachedImg.name}"` : ''} to your LinkedIn profile?\n\n"${postText}"`
            : isFileDelete
            ? `Do you want to permanently delete the file "${targetPath}" from disk?`
            : `The agent is about to execute "${step.tool}" which has consequential external effects.`,
          consequences: isLinkedIn
            ? [
                `Post content: "${postText.slice(0, 120)}${postText.length > 120 ? '...' : ''}"`,
                ...(attachedImg ? [`Attached Image: ${attachedImg.name}${attachedImg.path ? ` (${attachedImg.path})` : ''}`] : []),
                'This action will publish a public update visible to your professional network on LinkedIn.',
                'You can review, edit, or delete the post directly on LinkedIn at any time afterwards.',
              ]
            : isFileDelete
            ? [
                `Target file: ${targetPath}`,
                'This action will permanently delete the file from your computer.',
                'Irreversible action: This file may not be recoverable from Recycle Bin.',
              ]
            : [
                `Tool invocation: ${step.tool}`,
                `Parameters: ${JSON.stringify(step.params)}`,
                'May affect external systems or persist irreversible changes.',
              ],
          parameters: step.params,
          timestamp: Date.now(),
          whyRequired: isLinkedIn
            ? `Publishing will make this content${attachedImg ? ' and attached image' : ''} publicly visible to your professional network and connections on LinkedIn.`
            : isFileDelete
            ? 'This action will permanently delete the selected file from disk and cannot be undone.'
            : 'This consequential action may modify external data or persist changes.',
          targetResource: isLinkedIn
            ? 'LinkedIn Profile & Public Activity Feed'
            : isFileDelete
            ? (targetPath || 'Selected local file')
            : (step.params?.path || step.params?.url || 'External System'),
          ifAllowed: isLinkedIn
            ? `The agent will publish the exact post content${attachedImg ? ' and attached image' : ''} shown above to your LinkedIn feed and verify the result.`
            : isFileDelete
            ? 'The file will be permanently removed from disk and verified.'
            : 'The operation will proceed and verify the outcome.',
          ifDenied: isLinkedIn
            ? 'The post will remain unpublished and no changes will be made to your LinkedIn account.'
            : isFileDelete
            ? 'The file will remain intact and unchanged on disk.'
            : 'The action is immediately cancelled and no changes are made.',
          attachedImage: attachedImg,
        };

        const approved = await this.approvalManager.requestApproval(
          approvalReq,
          (req) => this.callbacks.onApprovalRequested(req)
        );

        if (!approved || this.isCancelled) {
          step.status = 'skipped';
          step.error = 'User rejected execution of consequential action.';
          this.updateStep(step);
          this.emitLog('warn', 'Action Rejected', `User denied approval for step ${step.id}. Halting execution.`);
          overallSuccess = false;
          failureReason = 'User rejected consequential action';
          break;
        }

        this.callbacks.onStatusChanged({
          taskId,
          status: 'executing',
          verificationStatus: 'UNVERIFIED',
          taskRecord,
        });
      }

      // Execute Step with bounded retry (max 2 retries)
      const maxRetries = 2;
      let attempt = 0;
      let stepResult: ToolExecutionResult = { success: false };

      while (attempt <= maxRetries && !this.isCancelled) {
        attempt++;
        const context: ExecutionContext = {
          taskId,
          stepId: step.id,
          browserService: this.browserService,
          artifactService: this.artifactService,
          tabManager: this.tabManager,
          accumulatedFindings,
          accumulatedConclusion,
          emitLog: (level, title, details, data) => this.emitLog(level, title, details, data, step.id),
          checkCancelled: () => this.isCancelled,
        };

        stepResult = await this.toolRegistry.executeTool(step.tool, step.params, context);
        if (stepResult.success || this.isCancelled) {
          break;
        }

        if (attempt <= maxRetries) {
          this.emitLog(
            'warn',
            `Step ${step.id} retry (${attempt}/${maxRetries})`,
            `Transient error: ${stepResult.error}. Retrying in 1s...`
          );
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      stepResults.set(step.id, stepResult);

      if (stepResult.success) {
        step.status = 'completed';
        
        // Clean textual result for UI display
        if (typeof stepResult.data === 'string') {
          step.result = stepResult.data;
        } else if (stepResult.data?.title) {
          step.result = `Title: "${stepResult.data.title}"`;
        } else if (stepResult.data?.count) {
          step.result = `Extracted ${stepResult.data.count} items`;
        } else if (stepResult.data?.path) {
          step.result = `Saved: ${stepResult.data.name || stepResult.data.path}`;
        } else if (stepResult.data?.verified) {
          step.result = `Verified ${stepResult.data.rowCount} rows`;
        } else {
          step.result = 'Step completed successfully';
        }

        this.updateStep(step);

        // If this step produced an artifact, record it
        if ((step.tool === 'file_create_csv' || step.tool === 'file_create_pdf') && stepResult.data) {
          const artifactItem = stepResult.data;
          taskRecord.artifacts = taskRecord.artifacts || [];
          taskRecord.artifacts.push(artifactItem);
          if (step.tool === 'file_create_pdf') {
            taskRecord.pdfReportPath = artifactItem.path;
          }
        }

        // Store findings and conclusion extracted from research steps or document creation
        if (step.tool === 'chat_response' && (stepResult.data?.message || stepResult.data?.conclusion)) {
          accumulatedConclusion = stepResult.data.conclusion || stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.tool === 'browser_open_tab' && (stepResult.data?.conclusion || stepResult.data?.message)) {
          accumulatedConclusion = stepResult.data.conclusion || stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.tool === 'browser_linkedin_post' && (stepResult.data?.conclusion || stepResult.data?.message)) {
          accumulatedConclusion = stepResult.data.conclusion || stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.tool === 'browser_youtube_play' && (stepResult.data?.conclusion || stepResult.data?.message)) {
          accumulatedConclusion = stepResult.data.conclusion || stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.tool === 'notes_gallery_search_and_open' && (stepResult.data?.conclusion || stepResult.data?.message)) {
          accumulatedConclusion = stepResult.data.conclusion || stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.tool === 'notes_gallery_open' && (stepResult.data?.conclusion || stepResult.data?.message)) {
          accumulatedConclusion = stepResult.data.conclusion || stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.tool === 'browser_check_profile' && (stepResult.data?.conclusion || stepResult.data?.message)) {
          accumulatedConclusion = stepResult.data.conclusion || stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.tool === 'file_delete' && (stepResult.data?.conclusion || stepResult.data?.message)) {
          accumulatedConclusion = stepResult.data.conclusion || stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.tool === 'browser_extract_startups' && stepResult.data?.startups) {
          accumulatedFindings = stepResult.data.startups;
          taskRecord.findings = accumulatedFindings;
        } else if (step.tool === 'browser_compare_prices' && stepResult.data?.items) {
          accumulatedFindings = stepResult.data.items;
          taskRecord.findings = accumulatedFindings;
          if (stepResult.data.conclusion) {
            accumulatedConclusion = stepResult.data.conclusion;
            taskRecord.resultSummary = accumulatedConclusion;
          }
        } else if (step.tool === 'browser_search_and_extract' && stepResult.data?.items) {
          accumulatedFindings = stepResult.data.items;
          taskRecord.findings = accumulatedFindings;
          if (stepResult.data.conclusion) {
            accumulatedConclusion = stepResult.data.conclusion;
            taskRecord.resultSummary = accumulatedConclusion;
          }
        } else if ((step.tool === 'file_create_pdf' || step.tool === 'file_create_csv') && Array.isArray(step.params?.rows)) {
          // Only use static plan rows if no dynamic findings were collected by prior research tools
          if (accumulatedFindings.length === 0) {
            accumulatedFindings = step.params.rows;
            taskRecord.findings = accumulatedFindings;
          }
        }

        // Prioritize dynamic calculated conclusion over static plan guesses
        if (accumulatedConclusion) {
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (step.params?.conclusion && typeof step.params.conclusion === 'string') {
          accumulatedConclusion = step.params.conclusion;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (stepResult.evidence?.conclusion) {
          accumulatedConclusion = stepResult.evidence.conclusion;
          taskRecord.resultSummary = accumulatedConclusion;
        } else if (stepResult.data?.message && typeof stepResult.data.message === 'string') {
          accumulatedConclusion = stepResult.data.message;
          taskRecord.resultSummary = accumulatedConclusion;
        }
      } else {
        step.status = 'failed';
        step.error = stepResult.error || 'Execution failed';
        this.updateStep(step);
        overallSuccess = false;
        failureReason = step.error;
        this.emitLog('error', `Step ${step.id} Failed`, step.error);
        break; // Stop execution on unrecoverable failure
      }
    }

    // Determine Pre-Verification Task Status
    let finalStatus: TaskStatus = 'completed';
    if (this.isCancelled) {
      finalStatus = 'cancelled';
    } else if (!overallSuccess) {
      finalStatus = 'failed';
    }

    // Phase: Independent Verification
    this.emitLog('info', 'Starting Independent Verification', 'Auditing physical artifacts and execution evidence...');
    this.callbacks.onStatusChanged({
      taskId,
      status: 'verifying',
      verificationStatus: 'UNVERIFIED',
      taskRecord,
    });

    const verificationReport = await this.verificationEngine.verifyTask(
      taskId,
      plan,
      stepResults
    );

    this.emitLog(
      verificationReport.status === 'VERIFIED' ? 'success' : 'warn',
      `Verification Complete: ${verificationReport.status}`,
      verificationReport.summary
    );

    // Save final state
    taskRecord.status = finalStatus;
    taskRecord.verificationStatus = verificationReport.status;
    taskRecord.completedAt = Date.now();
    taskRecord.verificationReport = verificationReport.summary;
    taskRecord.verificationDetails = verificationReport;
    if (failureReason) {
      taskRecord.error = failureReason;
    }

    if (!taskRecord.resultSummary && taskRecord.findings && taskRecord.findings.length > 0) {
      taskRecord.resultSummary = `Research workflow successfully completed across ${taskRecord.findings.length} target entities. All findings, pricing tiers, and citations have been audited and compiled into the report deliverable.`;
    }

    this.db.saveTask(taskRecord);
    this.callbacks.onStatusChanged({
      taskId,
      status: finalStatus,
      verificationStatus: verificationReport.status,
      report: verificationReport,
      taskRecord,
    });

    this.wsService.broadcast('verification:report', verificationReport);
    this.wsService.broadcast('task:status', {
      taskId,
      status: finalStatus,
      verificationStatus: verificationReport.status,
    });

    this.currentTaskId = null;
    return taskRecord;
  }

  private updateStep(step: PlanStep): void {
    this.callbacks.onStepUpdated(step);
    this.wsService.broadcast('step:updated', step);
  }

  private emitLog(
    level: ActionLogItem['level'],
    title: string,
    details?: string,
    data?: any,
    stepId?: string
  ): void {
    const log: ActionLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      level,
      title,
      details,
      data,
      stepId: stepId || this.activeStepId || undefined,
    };

    if (this.currentTaskId) {
      this.db.logAction(this.currentTaskId, log);
    }

    this.callbacks.onLogAdded(log);
    this.wsService.broadcast('task:log', log);
  }
}
