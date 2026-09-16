import { PlanApiResponse } from '@/utils/types';

export async function getPlan(contextId?: string | null): Promise<PlanApiResponse> {
  const url = new URL('/api/data', window.location.origin);
  if (contextId) {
    url.searchParams.set('contextId', contextId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch daily export plan (HTTP ${response.status})`);
  }

  return (await response.json()) as PlanApiResponse;
}

