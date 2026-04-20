export interface RepositoryInsight {
  date: string;
  commits: number;
}

export interface GitHubRepository {
  getCommitActivity(owner: string, repo: string, token?: string): Promise<RepositoryInsight[]>;
}

function isSafeGitHubSegment(value: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(value);
}

export class GitHubApiRepository implements GitHubRepository {
  async getCommitActivity(owner: string, repo: string, token?: string): Promise<RepositoryInsight[]> {
    if (!isSafeGitHubSegment(owner) || !isSafeGitHubSegment(repo)) {
      return [];
    }

    const apiUrl = new URL(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stats/commit_activity`,
      'https://api.github.com'
    );

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'GitHub-Insights-Pro',
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      return [];
    }

    const weeks = (await response.json()) as Array<{ week: number; total: number }>;

    return weeks.map((weekData) => ({
      date: new Date(weekData.week * 1000).toISOString().slice(0, 10),
      commits: weekData.total
    }));
  }
}
