import { Router } from 'express';
import { GitHubApiRepository } from '../../data/repositories/github.repository';
import { InsightsService } from '../../services/insights.service';

const insightsService = new InsightsService(new GitHubApiRepository());

export const insightsRouter = Router();

insightsRouter.get('/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');

  const insights = await insightsService.getRepositoryInsights(owner, repo, token);
  res.status(200).json(insights);
});
