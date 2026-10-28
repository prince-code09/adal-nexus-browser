import * as fs from 'fs';
import * as path from 'path';
import type { ArtifactItem } from '../../shared/types';

export class ArtifactService {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir || 'artifacts');
    this.ensureBaseDir();
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  public ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Resolve an artifact path securely within the artifacts directory to prevent directory traversal
   */
  public resolveSafePath(relativePath: string): string {
    const cleanRelative = relativePath.replace(/^artifacts[\\/]/, '');
    const resolved = path.resolve(this.baseDir, cleanRelative);

    // Cross-platform case-insensitive path traversal check
    const rel = path.relative(this.baseDir, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Security Violation: Path traversal outside artifact directory is prohibited: ${relativePath}`);
    }
    return resolved;
  }

  /**
   * Write a CSV file with headers and records
   */
  public async writeCsv(
    relativePath: string,
    headers: string[],
    records: Record<string, any>[]
  ): Promise<ArtifactItem> {
    const fullPath = this.resolveSafePath(relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCsv).join(',');
    const recordLines = records.map((rec) =>
      headers.map((h) => escapeCsv(rec[h] ?? '')).join(',')
    );

    const csvContent = [headerLine, ...recordLines].join('\n') + '\n';
    fs.writeFileSync(fullPath, csvContent, 'utf8');

    const stats = fs.statSync(fullPath);
    return {
      name: path.basename(fullPath),
      path: fullPath,
      type: 'text/csv',
      size: stats.size,
      headers,
      rows: records,
      contentPreview: csvContent.slice(0, 1000),
    };
  }

  /**
   * Read and parse a CSV file strictly for independent verification
   */
  public async readAndParseCsv(relativePath: string): Promise<{
    headers: string[];
    records: Record<string, string>[];
    rowCount: number;
    rawContent: string;
    sizeBytes: number;
  }> {
    const fullPath = this.resolveSafePath(relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Artifact file does not exist at: ${fullPath}`);
    }

    const rawContent = fs.readFileSync(fullPath, 'utf8');
    const stats = fs.statSync(fullPath);

    // Robust CSV parser supporting quotes and escaped quotes
    const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return {
        headers: [],
        records: [],
        rowCount: 0,
        rawContent,
        sizeBytes: stats.size,
      };
    }

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const headers = parseCsvLine(lines[0]).map((h) => h.trim());
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = (values[idx] ?? '').trim();
      });
      records.push(record);
    }

    return {
      headers,
      records,
      rowCount: records.length,
      rawContent,
      sizeBytes: stats.size,
    };
  }

  public getArtifactItem(filePath: string): ArtifactItem | null {
    try {
      const fullPath = this.resolveSafePath(filePath);
      if (!fs.existsSync(fullPath)) return null;
      const stats = fs.statSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      let type = 'application/octet-stream';
      if (ext === '.csv') type = 'text/csv';
      if (ext === '.json') type = 'application/json';
      if (ext === '.txt') type = 'text/plain';

      return {
        name: path.basename(fullPath),
        path: fullPath,
        type,
        size: stats.size,
      };
    } catch {
      return null;
    }
  }
}
