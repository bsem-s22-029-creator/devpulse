'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Panel } from './Panel';

export interface ProductivityPoint {
  date: string;
  commits: number;
  prs: number;
}

interface ProductivityChartProps {
  data: ProductivityPoint[];
}

export function ProductivityChart({ data }: ProductivityChartProps) {
  return (
    <Panel>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#e2e8f0' }}>Productivity</h3>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#94a3b8' }} />
            <Line type="monotone" dataKey="commits" stroke="#38bdf8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="prs" stroke="#818cf8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
