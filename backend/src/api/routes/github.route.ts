import { Response, Router } from 'express';
import { GitHubGraphqlRepository, GitHubRateLimitError } from '../../data/repositories/github-graphql.repository';
import { GitHubIntegrationService } from '../../services/github-integration.service';

const githubService = new GitHubIntegrationService(new GitHubGraphqlRepository());

export const githubRouter = Router();

function normalizeResponse<T>(data: T) {
  return {
    source: 'github',
    fetchedAt: new Date().toISOString(),
    data
  };
}

function getAccessToken(authorizationHeader?: string): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
  return token.length > 0 ? token : null;
}

function handleIntegrationError(error: unknown, res: Response) {
  if (error instanceof GitHubRateLimitError) {
    return res.status(429).json({
      error: 'GitHub API rate limit exceeded',
      resetAt: error.resetAt ?? null
    });
  }

  return res.status(502).json({
    error: 'Failed to fetch GitHub data'
  });
}

githubRouter.get('/profile', async (req, res) => {
  const token = getAccessToken(req.header('authorization'));
  if (!token) {
    return res.status(401).json({ error: 'Missing GitHub access token' });
  }

  try {
    const profile = await githubService.getUserProfile(token);
    return res.status(200).json(normalizeResponse(profile));
  } catch (error) {
    return handleIntegrationError(error, res);
  }
});

githubRouter.get('/repositories', async (req, res) => {
  const token = getAccessToken(req.header('authorization'));
  if (!token) {
    return res.status(401).json({ error: 'Missing GitHub access token' });
  }

  try {
    const repositories = await githubService.getRepositories(token);
    return res.status(200).json(normalizeResponse(repositories));
  } catch (error) {
    return handleIntegrationError(error, res);
  }
});

githubRouter.get('/commits', async (req, res) => {
  const token = getAccessToken(req.header('authorization'));
  if (!token) {
    return res.status(401).json({ error: 'Missing GitHub access token' });
  }

  try {
    const commits = await githubService.getCommitHistory(token);
    return res.status(200).json(
      normalizeResponse({
        lookbackDays: 90,
        totalCount: commits.length,
        items: commits
      })
    );
  } catch (error) {
    return handleIntegrationError(error, res);
  }
});

githubRouter.get('/work-items', async (req, res) => {
  const token = getAccessToken(req.header('authorization'));
  if (!token) {
    return res.status(401).json({ error: 'Missing GitHub access token' });
  }

  try {
    const workItems = await githubService.getWorkItems(token);
    return res.status(200).json(normalizeResponse(workItems));
  } catch (error) {
    return handleIntegrationError(error, res);
  }
});
