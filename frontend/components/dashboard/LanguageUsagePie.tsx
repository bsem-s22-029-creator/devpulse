'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Panel } from './Panel';

export interface LanguageSlice {
  name: string;
  value: number;
}

interface LanguageUsagePieProps {
  data: LanguageSlice[];
}

const COLORS = ['#38bdf8', '#818cf8', '#22c55e', '#f59e0b', '#f472b6', '#a78bfa'];

export function LanguageUsagePie({ data }: LanguageUsagePieProps) {
  return (
    <Panel>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#e2e8f0' }}>Language Usage</h3>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }: { name: string; percent: number }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[data.indexOf(entry) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
