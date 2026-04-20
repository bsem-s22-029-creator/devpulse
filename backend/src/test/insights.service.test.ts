import test from 'node:test';
import assert from 'node:assert/strict';
import { InsightsService } from '../services/insights.service';
import { GitHubRepository } from '../data/repositories/github.repository';

class FakeRepository implements GitHubRepository {
  async getCommitActivity() {
    return [
      { date: '2026-04-01', commits: 3 },
      { date: '2026-04-08', commits: 7 }
    ];
  }
}

test('InsightsService returns repository insight data', async () => {
  const service = new InsightsService(new FakeRepository());
  const result = await service.getRepositoryInsights('vercel', 'next.js');

  assert.equal(result.length, 2);
  assert.equal(result[0]?.commits, 3);
  assert.equal(result[1]?.date, '2026-04-08');
});
