'use client';

import { Panel } from './Panel';

export interface HeatmapCell {
  day: number;   // 0-based index
  value: number; // 0 = none, 1-4 = intensity
}

interface ActivityHeatmapProps {
  data: HeatmapCell[];
}

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const intensityColor = (v: number): string => {
  const colors = ['#1e293b', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa'];
  return colors[Math.min(v, colors.length - 1)];
};

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Pad to complete weeks
  const cells = [...data];
  while (cells.length % 7 !== 0) cells.push({ day: cells.length, value: 0 });
  const weeks = Math.ceil(cells.length / 7);

  return (
    <Panel>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#e2e8f0' }}>
        Activity Heatmap
      </h3>

      {/* Day-of-week labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, 1fr)`,
          gap: 4,
          marginBottom: 4,
        }}
      >
        {WEEK_LABELS.map((d) => (
          <span
            key={d}
            style={{ textAlign: 'center', fontSize: '0.65rem', color: '#475569' }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Cells grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, 1fr)`,
          gap: 4,
        }}
      >
        {cells.map((c) => (
          <div
            key={c.day}
            title={`Day ${c.day + 1}: ${c.value} contribution${c.value !== 1 ? 's' : ''}`}
            style={{
              background: intensityColor(c.value),
              borderRadius: 4,
              aspectRatio: '1/1',
              cursor: c.value > 0 ? 'pointer' : 'default',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: '0.75rem',
          justifyContent: 'flex-end',
        }}
      >
        <span style={{ fontSize: '0.7rem', color: '#475569' }}>Less</span>
        {[0, 1, 2, 3, 4].map((v) => (
          <div
            key={v}
            style={{
              width: 12,
              height: 12,
              background: intensityColor(v),
              borderRadius: 3,
            }}
          />
        ))}
        <span style={{ fontSize: '0.7rem', color: '#475569' }}>More</span>
      </div>
    </Panel>
  );
}
