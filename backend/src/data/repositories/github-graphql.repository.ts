const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const USER_AGENT = 'GitHub-Insights-Pro';
const PAGE_SIZE = 50;
const COMMIT_PAGE_SIZE = 100;
const COMMIT_LOOKBACK_DAYS = 90;
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RATE_LIMIT_WAIT_MS = 5000;

type PageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type GraphQlError = {
  message: string;
  type?: string;
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: GraphQlError[];
};

type ViewerProfileResponse = {
  viewer: {
    id: string;
    login: string;
    name: string | null;
    avatarUrl: string;
    url: string;
    bio: string | null;
    email: string | null;
    company: string | null;
    location: string | null;
    followers: { totalCount: number };
    following: { totalCount: number };
    createdAt: string;
  };
};

type ViewerRepositoriesResponse = {
  viewer: {
    repositories: {
      nodes: Array<{
        id: string;
        name: string;
        nameWithOwner: string;
        description: string | null;
        url: string;
        isPrivate: boolean;
        stargazerCount: number;
        forkCount: number;
        primaryLanguage: { name: string } | null;
        updatedAt: string;
        createdAt: string;
      } | null>;
      pageInfo: PageInfo;
    };
  };
};

type RepositoryCommitHistoryResponse = {
  repository: {
    defaultBranchRef: {
      target: {
        history: {
          nodes: Array<{
            oid: string;
            committedDate: string;
            messageHeadline: string;
            url: string;
            author: {
              name: string | null;
              user: { login: string } | null;
            } | null;
          } | null>;
          pageInfo: PageInfo;
        };
      } | null;
    } | null;
  } | null;
};

type CommitHistoryConnection = NonNullable<
  NonNullable<NonNullable<RepositoryCommitHistoryResponse['repository']>['defaultBranchRef']>['target']
>['history'];

type ViewerPullRequestsResponse = {
  viewer: {
    pullRequests: {
      nodes: Array<{
        id: string;
        number: number;
        title: string;
        url: string;
        state: string;
        createdAt: string;
        updatedAt: string;
        closedAt: string | null;
        mergedAt: string | null;
        repository: { nameWithOwner: string };
      } | null>;
      pageInfo: PageInfo;
    };
  };
};

type ViewerIssuesResponse = {
  viewer: {
    issues: {
      nodes: Array<{
        id: string;
        number: number;
        title: string;
        url: string;
        state: string;
        createdAt: string;
        updatedAt: string;
        closedAt: string | null;
        repository: { nameWithOwner: string };
      } | null>;
      pageInfo: PageInfo;
    };
  };
};

type RepositoriesForCommitScanResponse = {
  viewer: {
    repositories: {
      nodes: Array<{
        name: string;
        nameWithOwner: string;
        owner: { login: string };
        defaultBranchRef: { name: string } | null;
      } | null>;
      pageInfo: PageInfo;
    };
  };
};

export interface NormalizedUserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
  bio: string | null;
  email: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  following: number;
  createdAt: string;
}

export interface NormalizedRepository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  visibility: 'public' | 'private';
  stars: number;
  forks: number;
  primaryLanguage: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface NormalizedCommit {
  id: string;
  repository: string;
  committedAt: string;
  message: string;
  url: string;
  authorName: string | null;
  authorLogin: string | null;
}

export interface NormalizedWorkItem {
  id: string;
  type: 'pull_request' | 'issue';
  number: number;
  repository: string;
  title: string;
  url: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
}

export class GitHubRateLimitError extends Error {
  constructor(public readonly resetAt?: string) {
    super('GitHub API rate limit exceeded');
    this.name = 'GitHubRateLimitError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GitHubGraphqlRepository {
  async fetchUserProfile(token: string): Promise<NormalizedUserProfile> {
    const data = await this.request<ViewerProfileResponse>(
      `
      query ViewerProfile {
        viewer {
          id
          login
          name
          avatarUrl
          url
          bio
          email
          company
          location
          followers {
            totalCount
          }
          following {
            totalCount
          }
          createdAt
        }
      }
      `,
      {},
      token
    );

    return {
      id: data.viewer.id,
      username: data.viewer.login,
      displayName: data.viewer.name,
      avatarUrl: data.viewer.avatarUrl,
      profileUrl: data.viewer.url,
      bio: data.viewer.bio,
      email: data.viewer.email,
      company: data.viewer.company,
      location: data.viewer.location,
      followers: data.viewer.followers.totalCount,
      following: data.viewer.following.totalCount,
      createdAt: data.viewer.createdAt
    };
  }

  async fetchRepositories(token: string): Promise<NormalizedRepository[]> {
    const repositories: NormalizedRepository[] = [];
    let after: string | null = null;

    do {
      const data: ViewerRepositoriesResponse = await this.request<ViewerRepositoriesResponse>(
        `
        query ViewerRepositories($first: Int!, $after: String) {
          viewer {
            repositories(
              first: $first
              after: $after
              ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
              orderBy: { field: UPDATED_AT, direction: DESC }
            ) {
              nodes {
                id
                name
                nameWithOwner
                description
                url
                isPrivate
                stargazerCount
                forkCount
                primaryLanguage {
                  name
                }
                updatedAt
                createdAt
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
        `,
        { first: PAGE_SIZE, after },
        token
      );

      for (const repository of data.viewer.repositories.nodes) {
        if (!repository) {
          continue;
        }

        repositories.push({
          id: repository.id,
          name: repository.name,
          fullName: repository.nameWithOwner,
          description: repository.description,
          url: repository.url,
          visibility: repository.isPrivate ? 'private' : 'public',
          stars: repository.stargazerCount,
          forks: repository.forkCount,
          primaryLanguage: repository.primaryLanguage?.name ?? null,
          updatedAt: repository.updatedAt,
          createdAt: repository.createdAt
        });
      }

      after = data.viewer.repositories.pageInfo.hasNextPage
        ? data.viewer.repositories.pageInfo.endCursor
        : null;
    } while (after);

    return repositories;
  }

  async fetchCommitHistory(token: string): Promise<NormalizedCommit[]> {
    const commits: NormalizedCommit[] = [];
    const since = new Date(Date.now() - COMMIT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const repositories = await this.fetchRepositoriesForCommitScan(token);

    for (const repository of repositories) {
      if (!repository.defaultBranchName) {
        continue;
      }

      let after: string | null = null;

      do {
        const data = await this.request<RepositoryCommitHistoryResponse>(
          `
          query RepositoryCommitHistory($owner: String!, $name: String!, $since: GitTimestamp!, $first: Int!, $after: String) {
            repository(owner: $owner, name: $name) {
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: $first, after: $after, since: $since) {
                      nodes {
                        oid
                        committedDate
                        messageHeadline
                        url
                        author {
                          name
                          user {
                            login
                          }
                        }
                      }
                      pageInfo {
                        hasNextPage
                        endCursor
                      }
                    }
                  }
                }
              }
            }
          }
          `,
          {
            owner: repository.owner,
            name: repository.name,
            since,
            first: COMMIT_PAGE_SIZE,
            after
          },
          token
        );

        const history = data.repository?.defaultBranchRef?.target?.history as CommitHistoryConnection | undefined;
        if (!history) {
          break;
        }

        for (const commit of history.nodes) {
          if (!commit) {
            continue;
          }

          commits.push({
            id: commit.oid,
            repository: repository.fullName,
            committedAt: commit.committedDate,
            message: commit.messageHeadline,
            url: commit.url,
            authorName: commit.author?.name ?? null,
            authorLogin: commit.author?.user?.login ?? null
          });
        }

        after = history.pageInfo.hasNextPage ? history.pageInfo.endCursor : null;
      } while (after);
    }

    return commits.sort((a, b) => Date.parse(b.committedAt) - Date.parse(a.committedAt));
  }

  async fetchWorkItems(token: string): Promise<{ pullRequests: NormalizedWorkItem[]; issues: NormalizedWorkItem[] }> {
    const pullRequests: NormalizedWorkItem[] = [];
    const issues: NormalizedWorkItem[] = [];

    let pullRequestCursor: string | null = null;
    do {
      const data: ViewerPullRequestsResponse = await this.request<ViewerPullRequestsResponse>(
        `
        query ViewerPullRequests($first: Int!, $after: String) {
          viewer {
            pullRequests(first: $first, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }, states: [OPEN, CLOSED, MERGED]) {
              nodes {
                id
                number
                title
                url
                state
                createdAt
                updatedAt
                closedAt
                mergedAt
                repository {
                  nameWithOwner
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
        `,
        { first: PAGE_SIZE, after: pullRequestCursor },
        token
      );

      for (const pullRequest of data.viewer.pullRequests.nodes) {
        if (!pullRequest) {
          continue;
        }

        pullRequests.push({
          id: pullRequest.id,
          type: 'pull_request',
          number: pullRequest.number,
          repository: pullRequest.repository.nameWithOwner,
          title: pullRequest.title,
          url: pullRequest.url,
          state: pullRequest.state,
          createdAt: pullRequest.createdAt,
          updatedAt: pullRequest.updatedAt,
          closedAt: pullRequest.closedAt,
          mergedAt: pullRequest.mergedAt
        });
      }

      pullRequestCursor = data.viewer.pullRequests.pageInfo.hasNextPage
        ? data.viewer.pullRequests.pageInfo.endCursor
        : null;
    } while (pullRequestCursor);

    let issueCursor: string | null = null;
    do {
      const data: ViewerIssuesResponse = await this.request<ViewerIssuesResponse>(
        `
        query ViewerIssues($first: Int!, $after: String) {
          viewer {
            issues(first: $first, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }, states: [OPEN, CLOSED]) {
              nodes {
                id
                number
                title
                url
                state
                createdAt
                updatedAt
                closedAt
                repository {
                  nameWithOwner
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
        `,
        { first: PAGE_SIZE, after: issueCursor },
        token
      );

      for (const issue of data.viewer.issues.nodes) {
        if (!issue) {
          continue;
        }

        issues.push({
          id: issue.id,
          type: 'issue',
          number: issue.number,
          repository: issue.repository.nameWithOwner,
          title: issue.title,
          url: issue.url,
          state: issue.state,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          closedAt: issue.closedAt,
          mergedAt: null
        });
      }

      issueCursor = data.viewer.issues.pageInfo.hasNextPage ? data.viewer.issues.pageInfo.endCursor : null;
    } while (issueCursor);

    return { pullRequests, issues };
  }

  private async fetchRepositoriesForCommitScan(token: string): Promise<
    Array<{
      owner: string;
      name: string;
      fullName: string;
      defaultBranchName: string | null;
    }>
  > {
    const repositories: Array<{
      owner: string;
      name: string;
      fullName: string;
      defaultBranchName: string | null;
    }> = [];

    let after: string | null = null;

    do {
      const data: RepositoriesForCommitScanResponse = await this.request<RepositoriesForCommitScanResponse>(
        `
        query RepositoriesForCommitScan($first: Int!, $after: String) {
          viewer {
            repositories(
              first: $first
              after: $after
              ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
              orderBy: { field: UPDATED_AT, direction: DESC }
            ) {
              nodes {
                name
                nameWithOwner
                owner {
                  login
                }
                defaultBranchRef {
                  name
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
        `,
        { first: PAGE_SIZE, after },
        token
      );

      for (const repository of data.viewer.repositories.nodes) {
        if (!repository) {
          continue;
        }

        repositories.push({
          owner: repository.owner.login,
          name: repository.name,
          fullName: repository.nameWithOwner,
          defaultBranchName: repository.defaultBranchRef?.name ?? null
        });
      }

      after = data.viewer.repositories.pageInfo.hasNextPage
        ? data.viewer.repositories.pageInfo.endCursor
        : null;
    } while (after);

    return repositories;
  }

  private async request<T>(
    query: string,
    variables: Record<string, unknown>,
    token: string,
    attempt = 0
  ): Promise<T> {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT
      },
      body: JSON.stringify({ query, variables })
    });

    const resetAtEpoch = Number(response.headers.get('x-ratelimit-reset') ?? '0');
    const remaining = Number(response.headers.get('x-ratelimit-remaining') ?? '1');
    const resetAt = resetAtEpoch > 0 ? new Date(resetAtEpoch * 1000).toISOString() : undefined;

    if (response.status === 403 && remaining === 0) {
      return this.handleRateLimit<T>(query, variables, token, attempt, resetAtEpoch);
    }

    if (!response.ok) {
      throw new Error(`GitHub GraphQL request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GraphQlResponse<T>;

    if (payload.errors?.some((error) => error.type === 'RATE_LIMITED')) {
      return this.handleRateLimit<T>(query, variables, token, attempt, resetAtEpoch);
    }

    if (!payload.data) {
      const message = payload.errors?.[0]?.message ?? 'GitHub GraphQL request returned no data';
      throw new Error(message);
    }

    return payload.data;
  }

  private async handleRateLimit<T>(
    query: string,
    variables: Record<string, unknown>,
    token: string,
    attempt: number,
    resetAtEpoch: number
  ): Promise<T> {
    if (attempt >= MAX_RATE_LIMIT_RETRIES) {
      throw new GitHubRateLimitError(resetAtEpoch > 0 ? new Date(resetAtEpoch * 1000).toISOString() : undefined);
    }

    const resetDelayMs = resetAtEpoch > 0 ? Math.max(resetAtEpoch * 1000 - Date.now(), 0) : 0;
    const backoffMs = Math.min(1000 * 2 ** attempt, MAX_RATE_LIMIT_WAIT_MS);
    const waitMs = Math.min(Math.max(resetDelayMs, backoffMs), MAX_RATE_LIMIT_WAIT_MS);

    await sleep(waitMs);

    return this.request<T>(query, variables, token, attempt + 1);
  }
}
