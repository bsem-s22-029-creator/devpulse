'use client';

import { Panel } from './Panel';

interface FiltersBarProps {
  repo: string;
  repos: string[];
  from: string;
  to: string;
  onRepoChange: (v: string) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

const inputStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#e2e8f0',
  padding: '6px 10px',
  fontSize: '0.875rem',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: '0.8rem',
  color: '#94a3b8',
  flex: '1 1 160px',
};

export function FiltersBar({
  repo,
  repos,
  from,
  to,
  onRepoChange,
  onFromChange,
  onToChange,
}: FiltersBarProps) {
  return (
    <Panel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <label style={labelStyle}>
          Repository
          <select value={repo} onChange={(e) => onRepoChange(e.target.value)} style={inputStyle}>
            {repos.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            style={inputStyle}
          />
        </label>
      </div>
    </Panel>
  );
}
