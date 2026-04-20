import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'GitHub Insights Pro',
  description: 'Production-grade GitHub analytics dashboard'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#0f172a', color: '#e2e8f0' }}>
        {children}
      </body>
    </html>
  );
}
