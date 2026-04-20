import { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <section
      style={{
        background: '#111827',
        border: '1px solid #1e293b',
        borderRadius: 12,
        padding: '1rem 1.25rem',
      }}
      className={className}
    >
      {children}
    </section>
  );
}
