import {
  NormalizedCommit,
  NormalizedRepository,
  NormalizedUserProfile,
  NormalizedWorkItem
} from '../data/repositories/github-graphql.repository';

export interface GitHubIntegrationRepository {
  fetchUserProfile(token: string): Promise<NormalizedUserProfile>;
  fetchRepositories(token: string): Promise<NormalizedRepository[]>;
  fetchCommitHistory(token: string): Promise<NormalizedCommit[]>;
  fetchWorkItems(token: string): Promise<{ pullRequests: NormalizedWorkItem[]; issues: NormalizedWorkItem[] }>;
}

export class GitHubIntegrationService {
  constructor(private readonly repository: GitHubIntegrationRepository) {}

  async getUserProfile(token: string): Promise<NormalizedUserProfile> {
    return this.repository.fetchUserProfile(token);
  }

  async getRepositories(token: string): Promise<NormalizedRepository[]> {
    return this.repository.fetchRepositories(token);
  }

  async getCommitHistory(token: string): Promise<NormalizedCommit[]> {
    return this.repository.fetchCommitHistory(token);
  }

  async getWorkItems(token: string): Promise<{ pullRequests: NormalizedWorkItem[]; issues: NormalizedWorkItem[] }> {
    return this.repository.fetchWorkItems(token);
  }
}
