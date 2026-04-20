import { Panel } from './Panel';

type Tone = 'great' | 'good' | 'mid';

export interface Score {
  label: string;
  value: number;
  tone: Tone;
  description: string;
}

const toneColor: Record<Tone, string> = {
  great: '#22c55e',
  good: '#38bdf8',
  mid: '#f59e0b',
};

interface ScoreCardsProps {
  scores: Score[];
}

export function ScoreCards({ scores }: ScoreCardsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
      }}
    >
      {scores.map((s) => (
        <Panel key={s.label}>
          <p style={{ margin: '0 0 6px', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {s.label}
          </p>
          <p
            style={{
              margin: '0 0 4px',
              fontSize: '2.25rem',
              fontWeight: 700,
              color: toneColor[s.tone],
              lineHeight: 1,
            }}
          >
            {s.value}
          </p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{s.description}</p>
        </Panel>
      ))}
    </div>
  );
}
