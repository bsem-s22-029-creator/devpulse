import { Router } from 'express';
import { GitHubApiRepository } from '../../data/repositories/github.repository';
import { InsightsService, RawGitHubAnalyticsInput } from '../../services/insights.service';

const insightsService = new InsightsService(new GitHubApiRepository());

export const insightsRouter = Router();

insightsRouter.get('/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');

  const insights = await insightsService.getRepositoryInsights(owner, repo, token);
  res.status(200).json(insights);
});

insightsRouter.post('/aggregate', (req, res) => {
  const body = req.body as Partial<RawGitHubAnalyticsInput> | undefined;
  const commits = Array.isArray(body?.commits) ? body.commits : null;

  if (!commits) {
    return res.status(400).json({ error: 'commits must be provided as an array' });
  }

  const repositories = Array.isArray(body?.repositories) ? body.repositories : [];
  const pullRequests = Array.isArray(body?.pullRequests) ? body.pullRequests : [];

  try {
    const analytics = insightsService.buildAnalytics({
      commits,
      repositories,
      pullRequests
    });

    return res.status(200).json(analytics);
  } catch {
    return res.status(500).json({ error: 'Failed to aggregate GitHub analytics' });
  }
});
