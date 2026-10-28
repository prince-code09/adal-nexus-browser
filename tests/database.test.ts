import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from '../src/main/db/database';
import type { TaskRecord } from '../src/shared/types';

describe('DatabaseService SQLite and Task Persistence', () => {
  const testDbPath = path.resolve(__dirname, 'test_data', 'test.sqlite');
  let db: DatabaseService;

  beforeEach(() => {
    const dir = path.dirname(testDbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new DatabaseService(testDbPath);
  });

  afterEach(() => {
    try {
      db.close();
      const dir = path.dirname(testDbPath);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {}
  });

  it('saves and retrieves task records with verification status', () => {
    const task: TaskRecord = {
      id: 'task-test-101',
      goal: 'Research AI startups and output CSV',
      status: 'completed',
      verificationStatus: 'VERIFIED',
      createdAt: Date.now() - 5000,
      completedAt: Date.now(),
      verificationReport: 'Verified 5 startups in startups.csv',
      artifacts: [
        {
          name: 'startups.csv',
          path: 'artifacts/startups.csv',
          type: 'text/csv',
          size: 512,
        },
      ],
    };

    db.saveTask(task);

    const retrieved = db.getTask('task-test-101');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('task-test-101');
    expect(retrieved?.status).toBe('completed');
    expect(retrieved?.verificationStatus).toBe('VERIFIED');
    expect(retrieved?.artifacts?.length).toBe(1);
    expect(retrieved?.artifacts?.[0].name).toBe('startups.csv');
  });

  it('updates existing task status gracefully', () => {
    const task: TaskRecord = {
      id: 'task-test-102',
      goal: 'Initial task',
      status: 'planning',
      verificationStatus: 'UNVERIFIED',
      createdAt: Date.now(),
    };

    db.saveTask(task);

    // Update status to executing
    task.status = 'executing';
    db.saveTask(task);

    const updated = db.getTask('task-test-102');
    expect(updated?.status).toBe('executing');
  });

  it('lists all tasks sorted by creation date', () => {
    db.saveTask({
      id: 'task-1',
      goal: 'First task',
      status: 'completed',
      verificationStatus: 'VERIFIED',
      createdAt: 1000,
    });

    db.saveTask({
      id: 'task-2',
      goal: 'Second task',
      status: 'completed',
      verificationStatus: 'VERIFIED',
      createdAt: 2000,
    });

    const all = db.getAllTasks();
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all[0].id).toBe('task-2');
  });

  it('logs actions and retrieves logs for a task in chronological order', () => {
    const taskId = 'task-log-test-1';
    db.saveTask({
      id: taskId,
      goal: 'Logging test',
      status: 'executing',
      verificationStatus: 'UNVERIFIED',
      createdAt: 1000,
    });

    db.logAction(taskId, {
      id: 'log-1',
      timestamp: 1010,
      level: 'action',
      title: 'Navigating to website',
      details: 'Visiting https://example.com',
      tool: 'browser_navigate',
      data: { url: 'https://example.com' },
    });

    db.logAction(taskId, {
      id: 'log-2',
      timestamp: 1020,
      level: 'info',
      title: 'Page loaded',
      details: 'Example Domain',
    });

    db.logAction(taskId, {
      id: 'log-3',
      timestamp: 1030,
      level: 'success',
      title: 'Extraction completed',
      details: 'Extracted 1 item',
      data: { count: 1 },
    });

    const logs = db.getLogsForTask(taskId);
    expect(logs.length).toBe(3);
    expect(logs[0].id).toBe('log-1');
    expect(logs[0].title).toBe('Navigating to website');
    expect(logs[0].data?.url).toBe('https://example.com');
    expect(logs[1].id).toBe('log-2');
    expect(logs[2].id).toBe('log-3');
    expect(logs[2].data?.count).toBe(1);
  });

  it('safely handles getLogsForTask with unknown, empty or missing task ID', () => {
    // Unknown task ID
    const emptyLogs = db.getLogsForTask('non-existent-task-id');
    expect(Array.isArray(emptyLogs)).toBe(true);
    expect(emptyLogs.length).toBe(0);

    // Empty string
    const emptyStringLogs = db.getLogsForTask('');
    expect(Array.isArray(emptyStringLogs)).toBe(true);
    expect(emptyStringLogs.length).toBe(0);

    // Cast undefined
    const undefinedLogs = db.getLogsForTask(undefined as any);
    expect(Array.isArray(undefinedLogs)).toBe(true);
    expect(undefinedLogs.length).toBe(0);
  });
});
