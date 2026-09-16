import { AskAiRequest, AskAiResponse } from '@/utils/types';

export async function askAI(
  question: string,
  options?: { clientId?: string }
): Promise<AskAiResponse> {
  const payload: AskAiRequest = {
    question,
    ...(options?.clientId ? { clientId: options.clientId } : {}),
  };

  const response = await fetch('/api/ai-ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'AI assistant could not answer at this moment.');
  }

  return json as AskAiResponse;
}
