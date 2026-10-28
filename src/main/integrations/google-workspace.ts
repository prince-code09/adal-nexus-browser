export interface GoogleWorkspaceConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  scopes?: string[];
}

export interface GoogleSheetExportOptions {
  spreadsheetTitle: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
}

export class GoogleWorkspaceIntegration {
  private config: GoogleWorkspaceConfig;
  private isAuthorized: boolean = false;

  constructor(config: GoogleWorkspaceConfig = {}) {
    this.config = config;
    this.isAuthorized = Boolean(config.clientId && config.refreshToken);
  }

  public isConfigured(): boolean {
    return this.isAuthorized;
  }

  public getMissingConfiguration(): string[] {
    const missing: string[] = [];
    if (!this.config.clientId) missing.push('GOOGLE_CLIENT_ID');
    if (!this.config.clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
    if (!this.config.refreshToken) missing.push('GOOGLE_REFRESH_TOKEN');
    return missing;
  }

  public async exportToSheet(options: GoogleSheetExportOptions): Promise<{ spreadsheetId: string; url: string }> {
    if (!this.isAuthorized) {
      throw new Error(
        `Google Workspace integration not configured. Missing credentials: ${this.getMissingConfiguration().join(', ')}`
      );
    }

    // In Phase 2, this calls the official Google Sheets API v4 using authenticated OAuth client
    return {
      spreadsheetId: 'mock-sheet-id',
      url: `https://docs.google.com/spreadsheets/d/mock-sheet-id/edit`,
    };
  }

  public async readSheetData(spreadsheetId: string, range: string): Promise<any[][]> {
    if (!this.isAuthorized) {
      throw new Error('Google Workspace integration not configured.');
    }
    return [];
  }
}
