import { InsightsChart } from '../components/insights-chart';
import { getInsights } from '../lib/api';

const sampleData = [
  { date: '2026-03-24', commits: 4 },
  { date: '2026-03-31', commits: 7 },
  { date: '2026-04-07', commits: 5 },
  { date: '2026-04-14', commits: 9 }
];

export default async function HomePage() {
  const apiData = await getInsights('vercel', 'next.js');
  const chartData = apiData.length > 0 ? apiData.slice(-8) : sampleData;

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ marginTop: 0 }}>GitHub Insights Pro</h1>
      <p style={{ color: '#94a3b8' }}>Track repository activity with secure GitHub OAuth and PostgreSQL-backed APIs.</p>
      <a
        href={process.env.NEXT_PUBLIC_GITHUB_AUTH_URL ?? 'http://localhost:4000/api/auth/github/login'}
        style={{
          display: 'inline-block',
          marginBottom: 24,
          textDecoration: 'none',
          background: '#38bdf8',
          color: '#0f172a',
          padding: '10px 14px',
          borderRadius: 8,
          fontWeight: 700
        }}
      >
        Sign in with GitHub
      </a>
      <InsightsChart data={chartData} />
    </main>
  );
}
