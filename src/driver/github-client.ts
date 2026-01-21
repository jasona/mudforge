/**
 * GitHub Client - Creates issues via GitHub API.
 *
 * Used by the in-game bug report command to submit bug reports
 * directly to the game's GitHub repository.
 */

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface CreateIssueResult {
  success: boolean;
  url?: string;
  issueNumber?: number;
  error?: string;
}

/**
 * GitHub API client for creating issues.
 */
export class GitHubClient {
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  /**
   * Check if the client is configured with valid credentials.
   */
  isConfigured(): boolean {
    return !!(this.config.token && this.config.owner && this.config.repo);
  }

  /**
   * Create a new issue in the configured repository.
   *
   * @param title Issue title
   * @param body Issue body (markdown)
   * @param labels Labels to apply to the issue
   */
  async createIssue(
    title: string,
    body: string,
    labels?: string[]
  ): Promise<CreateIssueResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'GitHub not configured. Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in .env',
      };
    }

    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/issues`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          title,
          body,
          labels: labels || [],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `GitHub API error: ${response.status}`;

        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          // Ignore JSON parse errors
        }

        return {
          success: false,
          error: errorMessage,
        };
      }

      const data = (await response.json()) as { number: number; html_url: string };

      return {
        success: true,
        issueNumber: data.number,
        url: data.html_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
let githubClient: GitHubClient | null = null;

/**
 * Initialize the GitHub client with configuration.
 */
export function initializeGitHubClient(config: GitHubConfig): GitHubClient {
  githubClient = new GitHubClient(config);
  return githubClient;
}

/**
 * Get the GitHub client instance.
 */
export function getGitHubClient(): GitHubClient | null {
  return githubClient;
}

/**
 * Destroy the GitHub client instance. Used for testing.
 */
export function destroyGitHubClient(): void {
  githubClient = null;
}
