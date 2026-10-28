import * as path from 'path';
import * as fs from 'fs';
import type { TaskRecord, ActionLogItem, VerificationReport, ArtifactItem } from '../../shared/types';

export class DatabaseService {
  private db: any = null;
  private dbPath: string;
  private isSqliteNative: boolean = false;
  private fallbackStore: Map<string, TaskRecord> = new Map();

  constructor(customPath?: string) {
    const dataDir = customPath ? path.dirname(customPath) : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = customPath || path.resolve(dataDir, 'adal-nexus.sqlite');
    this.initDatabase();
  }

  private initDatabase(): void {
    try {
      // Use Node 22+ built-in node:sqlite DatabaseSync
      const sqlite = require('node:sqlite');
      if (sqlite && sqlite.DatabaseSync) {
        this.db = new sqlite.DatabaseSync(this.dbPath);
        this.isSqliteNative = true;
        this.createTables();
        return;
      }
    } catch (err) {
      console.warn('Native node:sqlite not available, using robust fallback storage:', err);
    }
    this.initFallback();
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        goal TEXT NOT NULL,
        status TEXT NOT NULL,
        verification_status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        plan_json TEXT,
        verification_report TEXT,
        verification_details_json TEXT,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS action_logs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        level TEXT NOT NULL,
        title TEXT NOT NULL,
        details TEXT,
        step_id TEXT,
        tool TEXT,
        data_json TEXT,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER,
        content_preview TEXT,
        headers_json TEXT,
        rows_json TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
      );
    `);
  }

  private initFallback(): void {
    const jsonBackup = this.dbPath.replace(/\.sqlite$/, '.json');
    try {
      if (fs.existsSync(jsonBackup)) {
        const raw = fs.readFileSync(jsonBackup, 'utf8');
        const list: TaskRecord[] = JSON.parse(raw);
        for (const t of list) {
          this.fallbackStore.set(t.id, t);
        }
      }
    } catch (err) {
      console.error('Failed to read JSON fallback database:', err);
    }
  }

  private persistFallback(): void {
    const jsonBackup = this.dbPath.replace(/\.sqlite$/, '.json');
    try {
      const list = Array.from(this.fallbackStore.values());
      fs.writeFileSync(jsonBackup, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write JSON fallback database:', err);
    }
  }

  public saveTask(task: TaskRecord): void {
    if (this.isSqliteNative && this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO tasks (
            id, goal, status, verification_status, created_at, completed_at,
            plan_json, verification_report, verification_details_json, error
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            verification_status = excluded.verification_status,
            completed_at = excluded.completed_at,
            plan_json = excluded.plan_json,
            verification_report = excluded.verification_report,
            verification_details_json = excluded.verification_details_json,
            error = excluded.error
        `);

        stmt.run(
          task.id,
          task.goal,
          task.status,
          task.verificationStatus,
          task.createdAt,
          task.completedAt || null,
          task.plan ? JSON.stringify(task.plan) : null,
          task.verificationReport || null,
          task.verificationDetails ? JSON.stringify(task.verificationDetails) : null,
          task.error || null
        );

        if (task.artifacts && task.artifacts.length > 0) {
          const deleteArtifacts = this.db.prepare('DELETE FROM artifacts WHERE task_id = ?');
          deleteArtifacts.run(task.id);

          const insertArtifact = this.db.prepare(`
            INSERT INTO artifacts (
              task_id, name, path, type, size, content_preview, headers_json, rows_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const a of task.artifacts) {
            insertArtifact.run(
              task.id,
              a.name,
              a.path,
              a.type,
              a.size || 0,
              a.contentPreview || null,
              a.headers ? JSON.stringify(a.headers) : null,
              a.rows ? JSON.stringify(a.rows) : null,
              Date.now()
            );
          }
        }
        return;
      } catch (err) {
        console.error('Error saving task to SQLite:', err);
      }
    }

    this.fallbackStore.set(task.id, { ...task });
    this.persistFallback();
  }

  public getTask(id: string): TaskRecord | null {
    if (this.isSqliteNative && this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const row = stmt.get(id);
        if (!row) return null;

        const artStmt = this.db.prepare('SELECT * FROM artifacts WHERE task_id = ?');
        const artifactRows = artStmt.all(id);

        const artifacts: ArtifactItem[] = artifactRows.map((r: any) => ({
          name: r.name,
          path: r.path,
          type: r.type,
          size: r.size,
          contentPreview: r.content_preview || undefined,
          headers: r.headers_json ? JSON.parse(r.headers_json) : undefined,
          rows: r.rows_json ? JSON.parse(r.rows_json) : undefined,
        }));

        return {
          id: row.id,
          goal: row.goal,
          status: row.status,
          verificationStatus: row.verification_status,
          createdAt: Number(row.created_at),
          completedAt: row.completed_at ? Number(row.completed_at) : undefined,
          plan: row.plan_json ? JSON.parse(row.plan_json) : undefined,
          verificationReport: row.verification_report || undefined,
          verificationDetails: row.verification_details_json ? JSON.parse(row.verification_details_json) : undefined,
          artifacts,
          error: row.error || undefined,
        };
      } catch (err) {
        console.error('Error retrieving task from SQLite:', err);
      }
    }

    return this.fallbackStore.get(id) || null;
  }

  public getAllTasks(): TaskRecord[] {
    if (this.isSqliteNative && this.db) {
      try {
        const stmt = this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
        const rows = stmt.all();

        return rows.map((row: any) => {
          const artStmt = this.db.prepare('SELECT * FROM artifacts WHERE task_id = ?');
          const artifactRows = artStmt.all(row.id);
          const artifacts: ArtifactItem[] = artifactRows.map((r: any) => ({
            name: r.name,
            path: r.path,
            type: r.type,
            size: r.size,
            contentPreview: r.content_preview || undefined,
            headers: r.headers_json ? JSON.parse(r.headers_json) : undefined,
            rows: r.rows_json ? JSON.parse(r.rows_json) : undefined,
          }));

          return {
            id: row.id,
            goal: row.goal,
            status: row.status,
            verificationStatus: row.verification_status,
            createdAt: Number(row.created_at),
            completedAt: row.completed_at ? Number(row.completed_at) : undefined,
            plan: row.plan_json ? JSON.parse(row.plan_json) : undefined,
            verificationReport: row.verification_report || undefined,
            verificationDetails: row.verification_details_json ? JSON.parse(row.verification_details_json) : undefined,
            artifacts,
            error: row.error || undefined,
          };
        });
      } catch (err) {
        console.error('Error fetching all tasks from SQLite:', err);
      }
    }

    return Array.from(this.fallbackStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public logAction(taskId: string, log: ActionLogItem): void {
    if (this.isSqliteNative && this.db) {
      try {
        const stmt = this.db.prepare(`
          INSERT INTO action_logs (
            id, task_id, timestamp, level, title, details, step_id, tool, data_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          log.id,
          taskId,
          log.timestamp,
          log.level,
          log.title,
          log.details || null,
          log.stepId || null,
          log.tool || null,
          log.data ? JSON.stringify(log.data) : null
        );
      } catch (err) {
        console.error('Error logging action to SQLite:', err);
      }
    }
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch {}
    }
  }
}
