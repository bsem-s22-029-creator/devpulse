import { GitHubRepository, RepositoryInsight } from '../data/repositories/github.repository';

const SESSION_GAP_MS = 90 * 60 * 1000;
const PRODUCTIVITY_TARGET_COMMITS_PER_DAY = 10;

export interface RawCommitInput {
  committedAt?: string;
  date?: string;
}

export interface RawRepositoryInput {
  id?: string;
  name?: string;
  fullName?: string;
}

export interface RawPullRequestInput {
  id?: string;
  number?: number;
  state?: string;
}

export interface RawGitHubAnalyticsInput {
  commits: RawCommitInput[];
  repositories?: RawRepositoryInput[];
  pullRequests?: RawPullRequestInput[];
}

type ChartPoint = {
  label: string;
  value: number;
};

export interface GitHubAnalyticsResult {
  summary: {
    commitCount: number;
    repositoryCount: number;
    pullRequestCount: number;
    consistencyScore: number;
    productivityScore: number;
    averageCommitsPerSession: number;
    longestInactivityGapHours: number;
  };
  metrics: {
    dailyCommitFrequency: ChartPoint[];
    weeklyProductivityTrend: ChartPoint[];
    peakCodingHours: ChartPoint[];
  };
}

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getWeekStartUtc(value: Date): Date {
  const utcMidnight = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const dayOfWeek = utcMidnight.getUTCDay();
  const distanceFromMonday = (dayOfWeek + 6) % 7;
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - distanceFromMonday);
  return utcMidnight;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
}

export class InsightsService {
  constructor(private readonly gitHubRepository: GitHubRepository) {}

  async getRepositoryInsights(owner: string, repo: string, token?: string): Promise<RepositoryInsight[]> {
    return this.gitHubRepository.getCommitActivity(owner, repo, token);
  }

  buildAnalytics(input: RawGitHubAnalyticsInput): GitHubAnalyticsResult {
    const commits = input.commits
      .map((commit) => {
        const sourceDate = commit.committedAt ?? commit.date;
        if (!sourceDate) {
          return null;
        }

        const parsedDate = new Date(sourceDate);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
      })
      .filter((value): value is Date => value !== null)
      .sort((left, right) => left.getTime() - right.getTime());

    const dailyMap = new Map<string, number>();
    const weeklyMap = new Map<string, number>();
    const hourlyMap = new Map<number, number>();

    for (const commitDate of commits) {
      const dailyKey = toIsoDate(commitDate);
      dailyMap.set(dailyKey, (dailyMap.get(dailyKey) ?? 0) + 1);

      const weekKey = toIsoDate(getWeekStartUtc(commitDate));
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + 1);

      const hourKey = commitDate.getUTCHours();
      hourlyMap.set(hourKey, (hourlyMap.get(hourKey) ?? 0) + 1);
    }

    const sortedDailyKeys = [...dailyMap.keys()].sort();
    const sortedWeeklyKeys = [...weeklyMap.keys()].sort();

    let sessionCount = 0;
    for (let index = 0; index < commits.length; index += 1) {
      if (index === 0) {
        sessionCount += 1;
        continue;
      }

      const gap = commits[index]!.getTime() - commits[index - 1]!.getTime();
      if (gap > SESSION_GAP_MS) {
        sessionCount += 1;
      }
    }

    let longestGapHours = 0;
    for (let index = 1; index < commits.length; index += 1) {
      const gapHours = (commits[index]!.getTime() - commits[index - 1]!.getTime()) / (60 * 60 * 1000);
      if (gapHours > longestGapHours) {
        longestGapHours = gapHours;
      }
    }

    const activeRangeDailyValues: number[] = [];
    if (commits.length > 0) {
      const firstDay = new Date(Date.UTC(commits[0]!.getUTCFullYear(), commits[0]!.getUTCMonth(), commits[0]!.getUTCDate()));
      const lastDay = new Date(
        Date.UTC(commits[commits.length - 1]!.getUTCFullYear(), commits[commits.length - 1]!.getUTCMonth(), commits[commits.length - 1]!.getUTCDate())
      );

      for (let cursor = new Date(firstDay); cursor <= lastDay; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        activeRangeDailyValues.push(dailyMap.get(toIsoDate(cursor)) ?? 0);
      }
    }

    const meanDailyCommits =
      activeRangeDailyValues.length === 0
        ? 0
        : activeRangeDailyValues.reduce((sum, value) => sum + value, 0) / activeRangeDailyValues.length;
    const dailyVariance = calculateVariance(activeRangeDailyValues);
    const dailyStdDev = Math.sqrt(dailyVariance);
    const coefficientOfVariation = meanDailyCommits > 0 ? dailyStdDev / meanDailyCommits : 0;
    const consistencyScore = Math.max(0, Math.min(100, Math.round(100 / (1 + coefficientOfVariation))));

    const frequencyScore = Math.min((meanDailyCommits / PRODUCTIVITY_TARGET_COMMITS_PER_DAY) * 100, 100);
    const daysWithCommits = activeRangeDailyValues.filter((value) => value > 0).length;
    const distributionScore =
      activeRangeDailyValues.length === 0 ? 0 : (daysWithCommits / activeRangeDailyValues.length) * 100;
    const productivityScore = Math.max(0, Math.min(100, Math.round(frequencyScore * 0.7 + distributionScore * 0.3)));

    return {
      summary: {
        commitCount: commits.length,
        repositoryCount: input.repositories?.length ?? 0,
        pullRequestCount: input.pullRequests?.length ?? 0,
        consistencyScore,
        productivityScore,
        averageCommitsPerSession: sessionCount > 0 ? roundToTwo(commits.length / sessionCount) : 0,
        longestInactivityGapHours: roundToTwo(longestGapHours)
      },
      metrics: {
        dailyCommitFrequency: sortedDailyKeys.map((date) => ({ label: date, value: dailyMap.get(date) ?? 0 })),
        weeklyProductivityTrend: sortedWeeklyKeys.map((week) => ({ label: week, value: weeklyMap.get(week) ?? 0 })),
        peakCodingHours: Array.from({ length: 24 }, (_, hour) => ({
          label: `${hour.toString().padStart(2, '0')}:00`,
          value: hourlyMap.get(hour) ?? 0
        }))
      }
    };
  }
}
