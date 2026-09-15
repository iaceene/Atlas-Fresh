import { PlanApiResponse } from '@/utils/types';

export async function getPlan(): Promise<PlanApiResponse> {
  const response = await fetch('/api/data', {
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

