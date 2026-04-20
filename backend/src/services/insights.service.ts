import { GitHubRepository, RepositoryInsight } from '../data/repositories/github.repository';

export class InsightsService {
  constructor(private readonly gitHubRepository: GitHubRepository) {}

  async getRepositoryInsights(owner: string, repo: string, token?: string): Promise<RepositoryInsight[]> {
    return this.gitHubRepository.getCommitActivity(owner, repo, token);
  }
}
