export interface InsightPoint {
  date: string;
  commits: number;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export async function getInsights(owner: string, repo: string): Promise<InsightPoint[]> {
  try {
    const response = await fetch(`${baseUrl}/insights/${owner}/${repo}`, { cache: 'no-store' });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as InsightPoint[];
  } catch {
    return [];
  }
}
