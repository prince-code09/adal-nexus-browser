export interface GitHubIntegrationConfig {
  personalAccessToken?: string;
  defaultOwner?: string;
  defaultRepo?: string;
}

export class GitHubIntegration {
  private config: GitHubIntegrationConfig;
  private isConfiguredState: boolean = false;

  constructor(config: GitHubIntegrationConfig = {}) {
    this.config = config;
    this.isConfiguredState = Boolean(config.personalAccessToken);
  }

  public isConfigured(): boolean {
    return this.isConfiguredState;
  }

  public getMissingConfiguration(): string[] {
    const missing: string[] = [];
    if (!this.config.personalAccessToken) missing.push('GITHUB_PERSONAL_ACCESS_TOKEN');
    return missing;
  }

  public async createOrUpdateFile(
    path: string,
    content: string,
    commitMessage: string
  ): Promise<{ commitSha: string; fileUrl: string }> {
    if (!this.isConfiguredState) {
      throw new Error(`GitHub integration requires token. Missing: ${this.getMissingConfiguration().join(', ')}`);
    }

    return {
      commitSha: 'phase-2-sha',
      fileUrl: `https://github.com/${this.config.defaultOwner}/${this.config.defaultRepo}/blob/main/${path}`,
    };
  }
}
