import { describe, it, expect } from 'vitest';
import { ApprovalManager } from '../src/main/agent/approval/approval-manager';

describe('ApprovalManager Safety and Consequential Action Controls', () => {
  it('detects consequential actions based on tool name and parameters', () => {
    const manager = new ApprovalManager(true);

    expect(manager.isConsequential('send_message', {})).toBe(true);
    expect(manager.isConsequential('publish_content', {})).toBe(true);
    expect(manager.isConsequential('delete_data', {})).toBe(true);
    expect(manager.isConsequential('file_write', { delete: true })).toBe(true);
    expect(manager.isConsequential('browser_navigate', { url: 'https://example.com' })).toBe(false);
  });

  it('pauses and waits for user approval resolution', async () => {
    const manager = new ApprovalManager(true);

    const requestPromise = manager.requestApproval({
      id: 'req-1',
      stepId: 'step-3',
      actionType: 'consequential_action',
      title: 'Delete old artifacts',
      description: 'Purging previous run files',
      consequences: ['Deletes files'],
      parameters: { target: 'artifacts/*' },
      timestamp: Date.now(),
    });

    expect(manager.getPendingRequests().length).toBe(1);

    // Simulate user clicking "Approve" in UI
    const resolved = manager.resolveApproval('req-1', true);
    expect(resolved).toBe(true);

    const result = await requestPromise;
    expect(result).toBe(true);
    expect(manager.getPendingRequests().length).toBe(0);
  });

  it('handles user rejection correctly', async () => {
    const manager = new ApprovalManager(true);

    const requestPromise = manager.requestApproval({
      id: 'req-2',
      stepId: 'step-4',
      actionType: 'publish_content',
      title: 'Publish live tweet',
      description: 'Post updates',
      consequences: ['Public post'],
      parameters: {},
      timestamp: Date.now(),
    });

    manager.resolveApproval('req-2', false);

    const result = await requestPromise;
    expect(result).toBe(false);
  });

  it('cancels all pending requests on task cancellation', async () => {
    const manager = new ApprovalManager(true);

    const req1 = manager.requestApproval({
      id: 'req-cancel-1',
      stepId: 's1',
      actionType: 'delete_data',
      title: 'Title',
      description: 'Desc',
      consequences: ['c'],
      parameters: {},
      timestamp: Date.now(),
    });

    manager.cancelAll();

    const res1 = await req1;
    expect(res1).toBe(false);
    expect(manager.getPendingRequests().length).toBe(0);
  });

  it('updates requireApprovalForConsequential preference at runtime via setEnabled and setRequireApproval', () => {
    const manager = new ApprovalManager(true);
    expect(manager.isEnabled()).toBe(true);
    expect(manager.isConsequential('send_message', {})).toBe(true);

    // Disable approval requirement
    manager.setEnabled(false);
    expect(manager.isEnabled()).toBe(false);
    expect(manager.isConsequential('send_message', {})).toBe(false);
    expect(manager.isConsequential('delete_data', {})).toBe(false);

    // Re-enable approval requirement
    manager.setEnabled(true);
    expect(manager.isEnabled()).toBe(true);
    expect(manager.isConsequential('send_message', {})).toBe(true);

    // Test setRequireApproval method
    manager.setRequireApproval(false);
    expect(manager.isEnabled()).toBe(false);
    expect(manager.isConsequential('send_message', {})).toBe(false);
  });
});
