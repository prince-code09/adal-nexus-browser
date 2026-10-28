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
});
