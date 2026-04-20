import { GitHubRepository, RepositoryInsight } from '../data/repositories/github.repository';

const SESSION_GAP_MS = 90 * 60 * 1000;
const PRODUCTIVITY_TARGET_COMMITS_PER_DAY = 10;
const MERGED_PR_IMPACT_WEIGHT = 6;
const CLOSED_UNMERGED_PR_IMPACT_WEIGHT = 2;
const ISSUE_COLLAB_LOAD_WEIGHT = 1.5;
const OPEN_PR_COLLAB_LOAD_WEIGHT = 2;
const CLOSED_UNMERGED_PR_OUTCOME_CREDIT = 0.4;
const INACTIVITY_PENALTY_PER_GAP_DAY = 3;
const REPOSITORY_STAR_SIGNAL_WEIGHT = 0.6;
const REPOSITORY_FORK_SIGNAL_WEIGHT = 0.4;
const FRESHNESS_DECAY_DAYS = 45;

export interface RawCommitInput {
  committedAt?: string;
  date?: string;
}

export interface RawRepositoryInput {
  id?: string;
  name?: string;
  fullName?: string;
  stars?: number;
  forks?: number;
  updatedAt?: string;
}

export interface RawPullRequestInput {
  id?: string;
  number?: number;
  repository?: string;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string | null;
  mergedAt?: string | null;
}

export interface RawIssueInput {
  id?: string;
  number?: number;
  repository?: string;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string | null;
}

export interface RawGitHubAnalyticsInput {
  commits: RawCommitInput[];
  repositories?: RawRepositoryInput[];
  pullRequests?: RawPullRequestInput[];
  issues?: RawIssueInput[];
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
    impactScore: number;
    collaborationScore: number;
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function saturatingScore(value: number, target: number): number {
  if (value <= 0) {
    return 0;
  }

  return clamp(100 * (1 - Math.exp(-value / target)), 0, 100);
}

function regularityScore(coefficientOfVariation: number): number {
  return clamp(100 / (1 + coefficientOfVariation), 0, 100);
}

function safeNonNegative(value?: number): number {
  if (value == null) {
    return 0;
  }

  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[middle - 1]! + sortedValues[middle]!) / 2;
  }

  return sortedValues[middle]!;
}

function classifyPullRequestState(pullRequest: RawPullRequestInput): {
  isMerged: boolean;
  isClosed: boolean;
  isOpen: boolean;
} {
  const mergedAt = parseDate(pullRequest.mergedAt);
  const closedAt = parseDate(pullRequest.closedAt);
  const isMerged = pullRequest.state === 'MERGED' || mergedAt !== null;
  const isClosed = pullRequest.state === 'CLOSED' || closedAt !== null;
  const isOpen = pullRequest.state === 'OPEN' || (!isMerged && !isClosed);

  return { isMerged, isClosed, isOpen };
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
    const pullRequests = input.pullRequests ?? [];
    const issues = input.issues ?? [];
    const repositories = input.repositories ?? [];

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

    let latestActivityDate: Date | null = null;
    if (commits.length > 0) {
      latestActivityDate = commits[commits.length - 1]!;
    }
    for (const pullRequest of pullRequests) {
      const candidateDates = [parseDate(pullRequest.updatedAt), parseDate(pullRequest.mergedAt), parseDate(pullRequest.closedAt)];
      for (const candidateDate of candidateDates) {
        if (candidateDate && (!latestActivityDate || candidateDate.getTime() > latestActivityDate.getTime())) {
          latestActivityDate = candidateDate;
        }
      }
    }

    for (const issue of issues) {
      const candidateDates = [parseDate(issue.updatedAt), parseDate(issue.closedAt)];
      for (const candidateDate of candidateDates) {
        if (candidateDate && (!latestActivityDate || candidateDate.getTime() > latestActivityDate.getTime())) {
          latestActivityDate = candidateDate;
        }
      }
    }

    for (const repository of repositories) {
      const updatedAt = parseDate(repository.updatedAt);
      if (updatedAt && (!latestActivityDate || updatedAt.getTime() > latestActivityDate.getTime())) {
        latestActivityDate = updatedAt;
      }
    }

    if (!latestActivityDate) {
      latestActivityDate = new Date();
    }

    const activeRangeDailyValues: number[] = [];
    const activeRangeWeeklyValues: number[] = [];
    if (commits.length > 0) {
      const firstDay = new Date(Date.UTC(commits[0]!.getUTCFullYear(), commits[0]!.getUTCMonth(), commits[0]!.getUTCDate()));
      const lastDay = new Date(
        Date.UTC(commits[commits.length - 1]!.getUTCFullYear(), commits[commits.length - 1]!.getUTCMonth(), commits[commits.length - 1]!.getUTCDate())
      );

      for (let cursor = new Date(firstDay); cursor <= lastDay; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        activeRangeDailyValues.push(dailyMap.get(toIsoDate(cursor)) ?? 0);
      }

      const firstWeek = getWeekStartUtc(commits[0]!);
      const lastWeek = getWeekStartUtc(commits[commits.length - 1]!);
      for (let cursor = new Date(firstWeek); cursor <= lastWeek; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
        activeRangeWeeklyValues.push(weeklyMap.get(toIsoDate(cursor)) ?? 0);
      }
    }

    const meanDailyCommits =
      activeRangeDailyValues.length === 0
        ? 0
        : activeRangeDailyValues.reduce((sum, value) => sum + value, 0) / activeRangeDailyValues.length;
    const dailyVariance = calculateVariance(activeRangeDailyValues);
    const dailyStdDev = Math.sqrt(dailyVariance);
    const coefficientOfVariation = meanDailyCommits > 0 ? dailyStdDev / meanDailyCommits : 0;
    const dailyRegularityScore = regularityScore(coefficientOfVariation);
    const daysWithCommits = activeRangeDailyValues.filter((value) => value > 0).length;
    const activeDayScore =
      activeRangeDailyValues.length === 0 ? 0 : (daysWithCommits / activeRangeDailyValues.length) * 100;
    const weeklyMean =
      activeRangeWeeklyValues.length === 0
        ? 0
        : activeRangeWeeklyValues.reduce((sum, value) => sum + value, 0) / activeRangeWeeklyValues.length;
    const weeklyVariance = calculateVariance(activeRangeWeeklyValues);
    const weeklyStdDev = Math.sqrt(weeklyVariance);
    const weeklyCoefficientOfVariation = weeklyMean > 0 ? weeklyStdDev / weeklyMean : 0;
    const weeklyRhythmScore = regularityScore(weeklyCoefficientOfVariation);
    const inactivityPenaltyScore = clamp(100 - (longestGapHours / 24) * INACTIVITY_PENALTY_PER_GAP_DAY, 0, 100);

    const consistencyScore =
      commits.length === 0
        ? 0
        : Math.round(
            dailyRegularityScore * 0.35 +
              activeDayScore * 0.25 +
              weeklyRhythmScore * 0.25 +
              inactivityPenaltyScore * 0.15
          );

    const frequencyScore = Math.min((meanDailyCommits / PRODUCTIVITY_TARGET_COMMITS_PER_DAY) * 100, 100);
    const distributionScore =
      activeRangeDailyValues.length === 0 ? 0 : (daysWithCommits / activeRangeDailyValues.length) * 100;
    const productivityScore = Math.max(0, Math.min(100, Math.round(frequencyScore * 0.7 + distributionScore * 0.3)));

    const pullRequestStateCounts = pullRequests.reduce(
      (accumulator, pullRequest) => {
        const classification = classifyPullRequestState(pullRequest);
        return {
          merged: accumulator.merged + (classification.isMerged ? 1 : 0),
          closedUnmerged: accumulator.closedUnmerged + (!classification.isMerged && classification.isClosed ? 1 : 0),
          open: accumulator.open + (classification.isOpen ? 1 : 0)
        };
      },
      { merged: 0, closedUnmerged: 0, open: 0 }
    );
    const mergedPullRequestCount = pullRequestStateCounts.merged;
    const closedUnmergedPullRequestCount = pullRequestStateCounts.closedUnmerged;
    const openPullRequestCount = pullRequestStateCounts.open;
    const closedIssueCount = issues.filter((issue) => issue.state === 'CLOSED' || parseDate(issue.closedAt) !== null).length;

    const repositoryCountScore = saturatingScore(repositories.length, 5);
    const ecosystemSignalStrength = repositories.reduce((sum, repository) => {
      const stars = safeNonNegative(repository.stars);
      const forks = safeNonNegative(repository.forks);
      return sum + stars * REPOSITORY_STAR_SIGNAL_WEIGHT + forks * REPOSITORY_FORK_SIGNAL_WEIGHT;
    }, 0);
    const ecosystemScore = saturatingScore(ecosystemSignalStrength, 250);
    const freshnessValues = repositories
      .map((repository) => parseDate(repository.updatedAt))
      .filter((value): value is Date => value !== null)
      .map((updatedAt) => {
        const ageDays = Math.max(0, (latestActivityDate.getTime() - updatedAt.getTime()) / (24 * 60 * 60 * 1000));
        return clamp(100 * Math.exp(-ageDays / FRESHNESS_DECAY_DAYS), 0, 100);
      });
    const freshnessScore =
      freshnessValues.length === 0
        ? 0
        : freshnessValues.reduce((sum, value) => sum + value, 0) / freshnessValues.length;
    const repositoryActivityScore = Math.round(
      repositoryCountScore * 0.25 + ecosystemScore * 0.4 + freshnessScore * 0.35
    );

    const weightedCodeContribution =
      commits.length +
      mergedPullRequestCount * MERGED_PR_IMPACT_WEIGHT +
      closedUnmergedPullRequestCount * CLOSED_UNMERGED_PR_IMPACT_WEIGHT;
    const weightedNonCodeActivity =
      issues.length * ISSUE_COLLAB_LOAD_WEIGHT + openPullRequestCount * OPEN_PR_COLLAB_LOAD_WEIGHT;
    const contributionRatio =
      weightedCodeContribution + weightedNonCodeActivity === 0
        ? 0
        : weightedCodeContribution / (weightedCodeContribution + weightedNonCodeActivity);
    const contributionRatioScore = contributionRatio * 100;
    const impactScore = Math.round(repositoryActivityScore * 0.55 + contributionRatioScore * 0.45);

    const prVolumeScore = saturatingScore(pullRequests.length, 12);
    const resolvedPullRequests = mergedPullRequestCount + closedUnmergedPullRequestCount;
    const prMergeEfficiencyScore =
      resolvedPullRequests === 0
        ? 0
        : ((mergedPullRequestCount + closedUnmergedPullRequestCount * CLOSED_UNMERGED_PR_OUTCOME_CREDIT) /
            resolvedPullRequests) *
          100;
    const issueVolumeScore = saturatingScore(issues.length, 15);
    const issueResolutionScore = issues.length === 0 ? 0 : (closedIssueCount / issues.length) * 100;

    const collaborationRepos = new Set<string>();
    for (const pullRequest of pullRequests) {
      if (pullRequest.repository) {
        collaborationRepos.add(pullRequest.repository);
      }
    }
    for (const issue of issues) {
      if (issue.repository) {
        collaborationRepos.add(issue.repository);
      }
    }
    const repoBreadthScore = saturatingScore(collaborationRepos.size, 4);

    const responseDurationsHours: number[] = [];
    for (const pullRequest of pullRequests) {
      const createdAt = parseDate(pullRequest.createdAt);
      const resolvedAt = parseDate(pullRequest.mergedAt) ?? parseDate(pullRequest.closedAt);
      if (createdAt && resolvedAt && resolvedAt.getTime() >= createdAt.getTime()) {
        responseDurationsHours.push((resolvedAt.getTime() - createdAt.getTime()) / (60 * 60 * 1000));
      }
    }
    for (const issue of issues) {
      const createdAt = parseDate(issue.createdAt);
      const resolvedAt = parseDate(issue.closedAt);
      if (createdAt && resolvedAt && resolvedAt.getTime() >= createdAt.getTime()) {
        responseDurationsHours.push((resolvedAt.getTime() - createdAt.getTime()) / (60 * 60 * 1000));
      }
    }

    const medianResolutionHours = median(responseDurationsHours);
    const responsivenessScore =
      responseDurationsHours.length === 0 ? 0 : clamp(100 * Math.exp(-medianResolutionHours / (24 * 7)), 0, 100);
    const interactionBalanceScore =
      pullRequests.length + issues.length === 0
        ? 0
        : 100 * (1 - Math.abs(pullRequests.length - issues.length) / (pullRequests.length + issues.length));
    const teamworkSignalScore =
      repoBreadthScore * 0.45 + responsivenessScore * 0.4 + interactionBalanceScore * 0.15;

    const prCollaborationScore = prVolumeScore * 0.55 + prMergeEfficiencyScore * 0.45;
    const issueCollaborationScore = issueVolumeScore * 0.45 + issueResolutionScore * 0.55;
    const collaborationScore = Math.round(
      prCollaborationScore * 0.4 + issueCollaborationScore * 0.3 + teamworkSignalScore * 0.3
    );

    return {
      summary: {
        commitCount: commits.length,
        repositoryCount: repositories.length,
        pullRequestCount: pullRequests.length,
        consistencyScore,
        impactScore,
        collaborationScore,
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
