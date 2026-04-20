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

test('InsightsService builds aggregated analytics for frontend charts', () => {
  const service = new InsightsService(new FakeRepository());

  const analytics = service.buildAnalytics({
    commits: [
      { committedAt: '2026-04-01T09:00:00Z' },
      { committedAt: '2026-04-01T09:30:00Z' },
      { committedAt: '2026-04-02T10:00:00Z' },
      { committedAt: '2026-04-07T15:00:00Z' },
      { committedAt: '2026-04-07T17:00:00Z' }
    ],
    repositories: [{ id: 'r1' }, { id: 'r2' }],
    pullRequests: [{ id: 'pr1' }]
  });

  assert.equal(analytics.summary.commitCount, 5);
  assert.equal(analytics.summary.repositoryCount, 2);
  assert.equal(analytics.summary.pullRequestCount, 1);
  assert.equal(analytics.summary.averageCommitsPerSession, 1.25);
  assert.equal(analytics.summary.longestInactivityGapHours, 125);
  assert.equal(analytics.summary.consistencyScore, 44);
  assert.equal(analytics.summary.productivityScore, 28);

  assert.deepEqual(analytics.metrics.dailyCommitFrequency, [
    { label: '2026-04-01', value: 2 },
    { label: '2026-04-02', value: 1 },
    { label: '2026-04-07', value: 2 }
  ]);

  assert.deepEqual(analytics.metrics.weeklyProductivityTrend, [
    { label: '2026-03-30', value: 3 },
    { label: '2026-04-06', value: 2 }
  ]);

  const hour09 = analytics.metrics.peakCodingHours.find((point) => point.label === '09:00');
  const hour10 = analytics.metrics.peakCodingHours.find((point) => point.label === '10:00');
  const hour15 = analytics.metrics.peakCodingHours.find((point) => point.label === '15:00');
  const hour17 = analytics.metrics.peakCodingHours.find((point) => point.label === '17:00');

  assert.equal(analytics.metrics.peakCodingHours.length, 24);
  assert.equal(hour09?.value, 2);
  assert.equal(hour10?.value, 1);
  assert.equal(hour15?.value, 1);
  assert.equal(hour17?.value, 1);
});

test('InsightsService handles empty and invalid commit inputs', () => {
  const service = new InsightsService(new FakeRepository());

  const analytics = service.buildAnalytics({
    commits: [{ committedAt: 'not-a-date' }, {}]
  });

  assert.equal(analytics.summary.commitCount, 0);
  assert.equal(analytics.summary.averageCommitsPerSession, 0);
  assert.equal(analytics.summary.longestInactivityGapHours, 0);
  assert.equal(analytics.summary.consistencyScore, 100);
  assert.equal(analytics.summary.productivityScore, 0);
  assert.deepEqual(analytics.metrics.dailyCommitFrequency, []);
  assert.deepEqual(analytics.metrics.weeklyProductivityTrend, []);
  assert.equal(analytics.metrics.peakCodingHours.length, 24);
  assert.equal(analytics.metrics.peakCodingHours.every((point) => point.value === 0), true);
});
