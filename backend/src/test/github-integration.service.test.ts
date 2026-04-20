import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NormalizedCommit,
  NormalizedRepository,
  NormalizedUserProfile,
  NormalizedWorkItem
} from '../data/repositories/github-graphql.repository';
import { GitHubIntegrationRepository, GitHubIntegrationService } from '../services/github-integration.service';

class FakeGitHubIntegrationRepository implements GitHubIntegrationRepository {
  async fetchUserProfile(_token: string): Promise<NormalizedUserProfile> {
    return {
      id: 'U_1',
      username: 'octocat',
      displayName: 'The Octocat',
      avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
      profileUrl: 'https://github.com/octocat',
      bio: 'Test profile',
      email: null,
      company: '@github',
      location: 'San Francisco',
      followers: 10,
      following: 2,
      createdAt: '2026-01-01T00:00:00Z'
    };
  }

  async fetchRepositories(_token: string): Promise<NormalizedRepository[]> {
    return [
      {
        id: 'R_1',
        name: 'devpulse',
        fullName: 'octocat/devpulse',
        description: 'Analytics app',
        url: 'https://github.com/octocat/devpulse',
        visibility: 'public',
        stars: 42,
        forks: 7,
        primaryLanguage: 'TypeScript',
        updatedAt: '2026-04-01T00:00:00Z',
        createdAt: '2025-12-01T00:00:00Z'
      }
    ];
  }

  async fetchCommitHistory(_token: string): Promise<NormalizedCommit[]> {
    return [
      {
        id: 'c1',
        repository: 'octocat/devpulse',
        committedAt: '2026-04-15T00:00:00Z',
        message: 'Add github integration',
        url: 'https://github.com/octocat/devpulse/commit/c1',
        authorName: 'Octo Cat',
        authorLogin: 'octocat'
      }
    ];
  }

  async fetchWorkItems(_token: string): Promise<{ pullRequests: NormalizedWorkItem[]; issues: NormalizedWorkItem[] }> {
    return {
      pullRequests: [
        {
          id: 'PR_1',
          type: 'pull_request',
          number: 10,
          repository: 'octocat/devpulse',
          title: 'Improve API route',
          url: 'https://github.com/octocat/devpulse/pull/10',
          state: 'OPEN',
          createdAt: '2026-04-12T00:00:00Z',
          updatedAt: '2026-04-13T00:00:00Z',
          closedAt: null,
          mergedAt: null
        }
      ],
      issues: [
        {
          id: 'I_1',
          type: 'issue',
          number: 14,
          repository: 'octocat/devpulse',
          title: 'Bug report',
          url: 'https://github.com/octocat/devpulse/issues/14',
          state: 'CLOSED',
          createdAt: '2026-04-05T00:00:00Z',
          updatedAt: '2026-04-06T00:00:00Z',
          closedAt: '2026-04-06T00:00:00Z',
          mergedAt: null
        }
      ]
    };
  }
}

test('GitHubIntegrationService returns normalized profile data', async () => {
  const service = new GitHubIntegrationService(new FakeGitHubIntegrationRepository());

  const profile = await service.getUserProfile('token');
  assert.equal(profile.username, 'octocat');
  assert.equal(profile.followers, 10);
});

test('GitHubIntegrationService returns normalized repositories, commits and work items', async () => {
  const service = new GitHubIntegrationService(new FakeGitHubIntegrationRepository());

  const repositories = await service.getRepositories('token');
  const commits = await service.getCommitHistory('token');
  const workItems = await service.getWorkItems('token');

  assert.equal(repositories.length, 1);
  assert.equal(repositories[0]?.fullName, 'octocat/devpulse');

  assert.equal(commits.length, 1);
  assert.equal(commits[0]?.authorLogin, 'octocat');

  assert.equal(workItems.pullRequests.length, 1);
  assert.equal(workItems.issues.length, 1);
  assert.equal(workItems.pullRequests[0]?.type, 'pull_request');
  assert.equal(workItems.issues[0]?.type, 'issue');
});
