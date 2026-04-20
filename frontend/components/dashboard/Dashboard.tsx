'use client';

import { useMemo, useState } from 'react';
import { ActivityHeatmap, HeatmapCell } from './ActivityHeatmap';
import { FiltersBar } from './FiltersBar';
import { LanguageUsagePie, LanguageSlice } from './LanguageUsagePie';
import { ProductivityChart, ProductivityPoint } from './ProductivityChart';
import { Score, ScoreCards } from './ScoreCards';

// ─── Static seed data (replace with API calls as needed) ─────────────────────

const REPOS = ['all', 'devpulse', 'api-service', 'infra-tools'];

const PRODUCTIVITY: ProductivityPoint[] = [
  { date: '04/01', commits: 4, prs: 1 },
  { date: '04/03', commits: 7, prs: 2 },
  { date: '04/05', commits: 3, prs: 1 },
  { date: '04/07', commits: 9, prs: 3 },
  { date: '04/09', commits: 5, prs: 2 },
  { date: '04/11', commits: 11, prs: 4 },
  { date: '04/13', commits: 6, prs: 2 },
  { date: '04/15', commits: 8, prs: 3 },
];

const LANGUAGES: LanguageSlice[] = [
  { name: 'TypeScript', value: 48 },
  { name: 'JavaScript', value: 22 },
  { name: 'Python', value: 18 },
  { name: 'Go', value: 12 },
];

const HEATMAP: HeatmapCell[] = Array.from({ length: 35 }, (_, i) => ({
  day: i,
  value: Math.floor((Math.sin(i * 0.9) + 1) * 2.1), // deterministic 0–4
}));

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [repo, setRepo] = useState('all');
  const [from, setFrom] = useState('2026-04-01');
  const [to, setTo] = useState('2026-04-30');

  // In a real app these values would be fetched/derived from repo, from, and to.
  const scores: Score[] = useMemo<Score[]>(
    () => [
      { label: 'Consistency', value: 86, tone: 'good', description: 'Days with ≥1 contribution' },
      { label: 'Impact', value: 78, tone: 'mid', description: 'PRs merged + issues closed' },
      { label: 'Collaboration', value: 91, tone: 'great', description: 'Reviews & comments given' },
    ],
    []
  );

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '2rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', color: '#e2e8f0' }}>
          Developer Analytics
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
          Track your productivity, language usage, and activity at a glance.
        </p>
      </div>

      {/* Filters */}
      <FiltersBar
        repo={repo}
        repos={REPOS}
        from={from}
        to={to}
        onRepoChange={setRepo}
        onFromChange={setFrom}
        onToChange={setTo}
      />

      {/* Score cards */}
      <ScoreCards scores={scores} />

      {/* Charts row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '1rem',
        }}
      >
        {/* Productivity chart – 8/12 cols on wide, full on narrow */}
        <div style={{ gridColumn: 'span 8' }}>
          <ProductivityChart data={PRODUCTIVITY} />
        </div>

        {/* Language pie – 4/12 cols on wide */}
        <div style={{ gridColumn: 'span 4' }}>
          <LanguageUsagePie data={LANGUAGES} />
        </div>

        {/* Activity heatmap – full width */}
        <div style={{ gridColumn: 'span 12' }}>
          <ActivityHeatmap data={HEATMAP} />
        </div>
      </div>
    </div>
  );
}
