import { NextResponse } from 'next/server';
import path from 'node:path';
import type { AskAiRequest } from '@/utils/types';
import { parseAtlasWorkbook } from '@/utils/parser/parser';
import { createEngine } from '@/utils/engine/engine';

const UNSUPPORTED_ANSWER =
  'That information is not available in the supplied inputs or computed plan.';

type OllamaResponse = {
  response?: string;
};

function getQuestionTopic(question: string): 'risk' | 'gaps' | 'local' | null {
  const normalized = question.toLowerCase();

  if (
    normalized.includes('risk') ||
    normalized.includes('partial') ||
    normalized.includes('unserved') ||
    normalized.includes('client')
  ) {
    return 'risk';
  }
  if (
    normalized.includes('gap') ||
    normalized.includes('variance') ||
    normalized.includes('farm') ||
    normalized.includes('segment')
  ) {
    return 'gaps';
  }
  if (
    normalized.includes('local') ||
    normalized.includes('market') ||
    normalized.includes('residual')
  ) {
    return 'local';
  }

  return null;
}

function buildGroundedContext(topic: 'risk' | 'gaps' | 'local') {
  const workbookPath = path.join(
    process.cwd(),
    'public',
    'Atlas_Fresh_Production_Commercial_Data.xlsx'
  );
  const data = parseAtlasWorkbook(workbookPath);
  const engine = createEngine(data);
  const plan = engine.plan();
  const operations = engine.getOperation();

  const context = {
    kpis: plan.kpis,
    clients_at_risk:
      topic === 'risk'
        ? plan.clients
            .filter((client) => client.status !== 'COMPLETE')
            .map(({ client_id, status, reason, allocated_t, demand_t }) => ({
              client_id,
              status,
              reason,
              allocated_t,
              demand_t,
            }))
        : [],
    farm_segment_gaps:
      topic === 'gaps'
        ? data.farms.flatMap((farm) =>
            (['A', 'B', 'C', 'D'] as const).map((segment) => {
              const expected_t =
                farm.expected_daily_capacity_t *
                (farm[`expected_${segment}_pct`] / 100);
              const actual_t = farm[`actual_${segment}_t`];
              return {
                farm_id: farm.farm_id,
                segment,
                expected_t,
                actual_t,
                variance_t: actual_t - expected_t,
              };
            })
          )
        : [],
    local_residuals:
      topic === 'local'
        ? plan.farmSegmentBalances
            .filter((balance) => balance.local_t > 0)
            .map((balance) => ({
              farm_id: balance.farm_id,
              segment: balance.segment,
              local_t: balance.local_t,
              local_value_eur: balance.local_value_eur,
              reference_price_eur: data.referencePrices[balance.segment],
            }))
        : [],
    operations: operations
      .filter((operation) =>
        topic === 'risk'
          ? operation.kind === 'CLIENT_END'
          : topic === 'local'
            ? operation.kind === 'LOCAL_RESIDUAL'
            : operation.kind === 'KPI_SUMMARY'
      )
      .map(({ kind, message, data: operationData }) => ({
        kind,
        message,
        data: operationData,
      })),
    allowed_client_ids: data.clients.map((client) => client.client_id),
    allowed_farm_ids: data.farms.map((farm) => farm.farm_id),
    allowed_segments: ['A', 'B', 'C', 'D'],
  };

  return context;
}

function containsUnknownIdentifiers(answer: string, context: ReturnType<typeof buildGroundedContext>) {
  const identifiers = answer.match(/\b(?:C|F)\d+\b/g) ?? [];
  const allowed = new Set([
    ...context.allowed_client_ids,
    ...context.allowed_farm_ids,
  ]);
  return identifiers.some((identifier) => !allowed.has(identifier));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskAiRequest;
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'A question is required.' },
        { status: 400 }
      );
    }

    const topic = getQuestionTopic(question);
    if (!topic) {
      return NextResponse.json({
        success: true,
        answer: UNSUPPORTED_ANSWER,
        sources: [],
      });
    }

    const context = buildGroundedContext(topic);
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          system: `You are a read-only explanation layer for a deterministic allocation plan.
Answer only the user's supported question using the supplied JSON context.
Every number, client ID, farm ID, and segment must come from the context.
Do not calculate, allocate, recommend changes, confirm execution, or invent facts.
Always cite resolvable client IDs, farm IDs, or segment labels.
If the context does not support the answer, reply exactly: ${UNSUPPORTED_ANSWER}`,
          prompt: `Question: ${question}\n\nGrounded context:\n${JSON.stringify(context)}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned HTTP ${response.status}`);
      }

      const result = (await response.json()) as OllamaResponse;
      const answer = result.response?.trim();
      if (!answer || containsUnknownIdentifiers(answer, context)) {
        return NextResponse.json({
          success: true,
          answer: UNSUPPORTED_ANSWER,
          sources: [],
        });
      }

      return NextResponse.json({
        success: true,
        answer,
        sources: [`Server plan: ${topic}`, `Ollama model: ${model}`],
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error && error.name === 'AbortError'
            ? 'Ollama did not respond within 30 seconds.'
            : 'The assistant is unavailable. Start Ollama with model llama3.2:3b and try again.',
      },
      { status: 503 }
    );
  }
}
