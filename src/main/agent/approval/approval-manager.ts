import type { ApprovalRequest } from '../../../shared/types';

interface PendingApproval {
  request: ApprovalRequest;
  resolve: (approved: boolean) => void;
}

export class ApprovalManager {
  private pending: Map<string, PendingApproval> = new Map();
  private requireApprovalForConsequential: boolean = true;

  constructor(requireApproval = true) {
    this.requireApprovalForConsequential = requireApproval;
  }

  public setRequireApproval(enabled: boolean): void {
    this.requireApprovalForConsequential = enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.requireApprovalForConsequential = enabled;
  }

  public isEnabled(): boolean {
    return this.requireApprovalForConsequential;
  }

  /**
   * Evaluates if a given tool and its parameters constitute a consequential action
   */
  public isConsequential(toolName: string, params: Record<string, any>): boolean {
    if (!this.requireApprovalForConsequential) return false;

    // Direct consequential tools
    const consequentialTools = [
      'send_message',
      'publish_content',
      'delete_data',
      'execute_transaction',
      'consequential_action_demo',
      'browser_linkedin_post',
      'file_delete',
      'notes_gallery_delete',
    ];
    if (consequentialTools.includes(toolName)) return true;

    // Destructive file or external operations
    if (params?.delete === true || params?.overwrite === true) return true;
    if (params?.isSensitive === true) return true;

    return false;
  }

  /**
   * Create an approval request and wait for user resolution
   */
  public async requestApproval(
    request: ApprovalRequest,
    onRequestBroadcast?: (req: ApprovalRequest) => void
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.pending.set(request.id, { request, resolve });
      if (onRequestBroadcast) {
        onRequestBroadcast(request);
      }
    });
  }

  /**
   * Handle user response from UI
   */
  public resolveApproval(requestId: string, approved: boolean): boolean {
    const item = this.pending.get(requestId);
    if (!item) return false;

    this.pending.delete(requestId);
    item.resolve(approved);
    return true;
  }

  /**
   * Cancel all pending approval requests (e.g. on task cancellation)
   */
  public cancelAll(): void {
    for (const [id, item] of this.pending.entries()) {
      item.resolve(false);
    }
    this.pending.clear();
  }

  public getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pending.values()).map((p) => p.request);
  }
}
