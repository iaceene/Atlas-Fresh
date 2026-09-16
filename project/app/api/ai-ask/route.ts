import { NextResponse } from 'next/server';
import type { AskAiRequest } from '@/utils/types';
import { getAtlasContext } from '@/utils/atlas-context';

const UNSUPPORTED_ANSWER =
  'That information is not available in the supplied inputs or computed plan.';

type Topic = 'risk' | 'gaps' | 'local';

type ValidationContext = {
  metadata: {
    allowed_client_ids: string[];
    allowed_farm_ids: string[];
  };
};

function getQuestionTopic(question: string): Topic | null {
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

function containsUnknownIdentifiers(answer: string, context: ValidationContext) {
  const identifiers = answer.match(/\b(?:C|F)\d+\b/g) ?? [];
  const allowed = new Set([
    ...context.metadata.allowed_client_ids,
    ...context.metadata.allowed_farm_ids,
  ]);
  return identifiers.some((identifier) => !allowed.has(identifier));
}

function buildRiskContext(atlasContext: Awaited<ReturnType<typeof getAtlasContext>>) {
  const { data, plan, operations } = atlasContext;

  return {
    timestamp: new Date().toISOString(),
    plan_summary: {
      expected_plan_t: Math.round(plan.kpis.expected_plan_t * 100) / 100,
      actual_received_t: Math.round(plan.kpis.actual_received_t * 100) / 100,
      export_volume_t: Math.round(plan.kpis.export_volume_t * 100) / 100,
      local_volume_t: Math.round(plan.kpis.local_volume_t * 100) / 100,
      export_rate: Math.round(plan.kpis.export_rate * 10000) / 10000,
      station_capacity_t: Math.round(plan.kpis.station_capacity_t * 100) / 100,
      total_clients: plan.clients.length,
      at_risk_count: plan.kpis.at_risk_clients,
      complete_count: plan.clients.filter((c) => c.status === 'COMPLETE').length,
      export_revenue_eur: Math.round(plan.kpis.export_revenue_eur),
      local_value_eur: Math.round(plan.kpis.local_value_eur),
    },
    clients_at_risk: plan.clients
      .filter((client) => client.status !== 'COMPLETE')
      .map(({ client_id, status, reason, allocated_t, demand_t }) => ({
        client_id,
        status,
        reason,
        allocated_t,
        demand_t,
        shortage_t: demand_t - allocated_t,
      })),
    metadata: {
      allowed_client_ids: data.clients.map((client) => client.client_id),
      allowed_farm_ids: data.farms.map((farm) => farm.farm_id),
      allowed_segments: ['A', 'B', 'C', 'D'] as const,
      valid_statuses: ['COMPLETE', 'PARTIAL', 'UNSERVED'] as const,
      valid_reasons: [
        'INSUFFICIENT_COMPATIBLE_SEGMENT',
        'STATION_CAPACITY_REACHED',
        'ALLOCATION_CONFLICT',
      ] as const,
    },
    operations: operations.filter((operation) => operation.kind === 'CLIENT_END'),
  };
}

function buildGapsContext(atlasContext: Awaited<ReturnType<typeof getAtlasContext>>) {
  const { data, plan, operations } = atlasContext;

  return {
    timestamp: new Date().toISOString(),
    plan_summary: {
      expected_plan_t: Math.round(plan.kpis.expected_plan_t * 100) / 100,
      actual_received_t: Math.round(plan.kpis.actual_received_t * 100) / 100,
      export_volume_t: Math.round(plan.kpis.export_volume_t * 100) / 100,
      local_volume_t: Math.round(plan.kpis.local_volume_t * 100) / 100,
      export_rate: Math.round(plan.kpis.export_rate * 10000) / 10000,
      station_capacity_t: Math.round(plan.kpis.station_capacity_t * 100) / 100,
      total_clients: plan.clients.length,
      at_risk_count: plan.kpis.at_risk_clients,
      complete_count: plan.clients.filter((c) => c.status === 'COMPLETE').length,
      export_revenue_eur: Math.round(plan.kpis.export_revenue_eur),
      local_value_eur: Math.round(plan.kpis.local_value_eur),
    },
    farm_segment_gaps: data.farms.flatMap((farm) =>
      (['A', 'B', 'C', 'D'] as const).map((segment) => {
        const expected_t = farm.expected_daily_capacity_t * (farm[`expected_${segment}_pct`] / 100);
        const actual_t = farm[`actual_${segment}_t`];
        return {
          farm_id: farm.farm_id,
          segment,
          expected_t: Math.round(expected_t * 100) / 100,
          actual_t: Math.round(actual_t * 100) / 100,
          variance_t: Math.round((actual_t - expected_t) * 100) / 100,
        };
      })
    ),
    metadata: {
      allowed_client_ids: data.clients.map((client) => client.client_id),
      allowed_farm_ids: data.farms.map((farm) => farm.farm_id),
      allowed_segments: ['A', 'B', 'C', 'D'] as const,
      valid_statuses: ['COMPLETE', 'PARTIAL', 'UNSERVED'] as const,
      valid_reasons: [
        'INSUFFICIENT_COMPATIBLE_SEGMENT',
        'STATION_CAPACITY_REACHED',
        'ALLOCATION_CONFLICT',
      ] as const,
    },
    operations: operations.filter((operation) => operation.kind === 'KPI_SUMMARY'),
  };
}

function buildLocalContext(atlasContext: Awaited<ReturnType<typeof getAtlasContext>>) {
  const { data, plan, operations } = atlasContext;

  return {
    timestamp: new Date().toISOString(),
    plan_summary: {
      expected_plan_t: Math.round(plan.kpis.expected_plan_t * 100) / 100,
      actual_received_t: Math.round(plan.kpis.actual_received_t * 100) / 100,
      export_volume_t: Math.round(plan.kpis.export_volume_t * 100) / 100,
      local_volume_t: Math.round(plan.kpis.local_volume_t * 100) / 100,
      export_rate: Math.round(plan.kpis.export_rate * 10000) / 10000,
      station_capacity_t: Math.round(plan.kpis.station_capacity_t * 100) / 100,
      total_clients: plan.clients.length,
      at_risk_count: plan.kpis.at_risk_clients,
      complete_count: plan.clients.filter((c) => c.status === 'COMPLETE').length,
      export_revenue_eur: Math.round(plan.kpis.export_revenue_eur),
      local_value_eur: Math.round(plan.kpis.local_value_eur),
    },
    local_residuals: plan.farmSegmentBalances
      .filter((balance) => balance.local_t > 0)
      .map((balance) => ({
        farm_id: balance.farm_id,
        segment: balance.segment,
        local_t: Math.round(balance.local_t * 100) / 100,
        local_value_eur: Math.round(balance.local_value_eur * 100) / 100,
        reference_price_eur: Math.round((data.referencePrices[balance.segment] || 0) * 100) / 100,
      })),
    metadata: {
      allowed_client_ids: data.clients.map((client) => client.client_id),
      allowed_farm_ids: data.farms.map((farm) => farm.farm_id),
      allowed_segments: ['A', 'B', 'C', 'D'] as const,
      valid_statuses: ['COMPLETE', 'PARTIAL', 'UNSERVED'] as const,
      valid_reasons: [
        'INSUFFICIENT_COMPATIBLE_SEGMENT',
        'STATION_CAPACITY_REACHED',
        'ALLOCATION_CONFLICT',
      ] as const,
    },
    operations: operations.filter((operation) => operation.kind === 'LOCAL_RESIDUAL'),
  };
}

function buildClientContext(clientId: string, atlasContext: Awaited<ReturnType<typeof getAtlasContext>>) {
  const { data, plan, operations } = atlasContext;
  const client = plan.clients.find((item) => item.client_id === clientId);
  if (!client) return null;

  const clientAllocations = plan.allocations.filter(
    (allocation) => allocation.client_id === clientId
  );

  return {
    timestamp: new Date().toISOString(),
    plan_summary: {
      expected_plan_t: Math.round(plan.kpis.expected_plan_t * 100) / 100,
      actual_received_t: Math.round(plan.kpis.actual_received_t * 100) / 100,
      export_volume_t: Math.round(plan.kpis.export_volume_t * 100) / 100,
      local_volume_t: Math.round(plan.kpis.local_volume_t * 100) / 100,
      export_rate: Math.round(plan.kpis.export_rate * 10000) / 10000,
      station_capacity_t: Math.round(plan.kpis.station_capacity_t * 100) / 100,
      total_clients: plan.clients.length,
      at_risk_count: plan.kpis.at_risk_clients,
      complete_count: plan.clients.filter((c) => c.status === 'COMPLETE').length,
      export_revenue_eur: Math.round(plan.kpis.export_revenue_eur),
      local_value_eur: Math.round(plan.kpis.local_value_eur),
    },
    selected_client: {
      ...client,
      shortage_t: Math.round((client.demand_t - client.allocated_t) * 100) / 100,
    },
    client_allocations: clientAllocations.map((allocation) => ({
      farm_id: allocation.farm_id,
      segment: allocation.segment,
      tonnes: Math.round(allocation.tonnes * 100) / 100,
      quality_upgrade: Math.round(allocation.quality_upgrade * 100) / 100,
      export_revenue_eur: Math.round(allocation.export_revenue_eur),
    })),
    engine_log: operations,
    metadata: {
      allowed_client_ids: data.clients.map((clientItem) => clientItem.client_id),
      allowed_farm_ids: data.farms.map((farm) => farm.farm_id),
      allowed_segments: ['A', 'B', 'C', 'D'] as const,
      selected_client_id: clientId,
      valid_statuses: ['COMPLETE', 'PARTIAL', 'UNSERVED'] as const,
      valid_reasons: [
        'INSUFFICIENT_COMPATIBLE_SEGMENT',
        'STATION_CAPACITY_REACHED',
        'ALLOCATION_CONFLICT',
      ] as const,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskAiRequest;
    const question = body.question?.trim();
    const clientId = body.clientId?.trim();
    const contextId = body.contextId?.trim();

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'A question is required.' },
        { status: 400 }
      );
    }

    const topic = clientId ? 'risk' : getQuestionTopic(question);
    if (!topic) {
      return NextResponse.json({ success: true, answer: UNSUPPORTED_ANSWER, sources: [] });
    }

    const atlasContext = await getAtlasContext(contextId);
    const clientContext = clientId ? buildClientContext(clientId, atlasContext) : null;
    const groundedContext = clientId
      ? null
      : topic === 'risk'
      ? buildRiskContext(atlasContext)
      : topic === 'gaps'
      ? buildGapsContext(atlasContext)
      : buildLocalContext(atlasContext);

    const validationContext: ValidationContext | null = clientContext ?? groundedContext;

    if (clientId && !clientContext) {
      return NextResponse.json(
        { success: false, error: `Unknown client id: ${clientId}` },
        { status: 400 }
      );
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const token = process.env.LLM_TOKEN;
    if (!token) {
      throw new Error('Missing LLM token in environment (LLM_TOKEN)');
    }

    const systemPrompt = clientId
      ? `You are an analytical assistant for daily operational planning in agricultural export logistics.
Your role is to explain one selected client fulfillment row using only the provided context and the engine logs.

CORE RULES:
1. ONLY use data from the context provided—no external knowledge
2. NEVER calculate, estimate, or make assumptions beyond the provided fields
3. NEVER recommend changes or actions
4. Use MARKDOWN formatting for clarity
5. Every number, ID, and status MUST come from the provided context
6. Always cite the selected client ID and any allocation rows you mention
7. If data is unavailable, reply exactly: "${UNSUPPORTED_ANSWER}"`
      : `You are an analytical assistant for daily operational planning in agricultural export logistics.
Your role is to explain deterministic allocation plans using provided data—do NOT create, calculate, or recommend changes.

CORE RULES:
1. ONLY use data from the context provided—no external knowledge
2. NEVER calculate, estimate, or make assumptions
3. NEVER recommend changes or actions
4. Use MARKDOWN formatting for clarity
5. Every number, ID, and status MUST come from the provided context
6. Always cite sources: use Client IDs (C###), Farm IDs (F###), Segments (A/B/C/D)
7. If data is unavailable, reply exactly: "${UNSUPPORTED_ANSWER}"`;

    const userPrompt = clientId
      ? `QUESTION: ${question}

SELECTED CLIENT ROW LOGS:
${JSON.stringify(
  {
    selected_client: clientContext?.selected_client,
    client_allocations: clientContext?.client_allocations,
    engine_log: clientContext?.engine_log,
    plan_summary: clientContext?.plan_summary,
    metadata: clientContext?.metadata,
  },
  null,
  2
)}

REQUIRED: Explain the selected client row in natural language. Use the engine log to explain what happened and why the client ended as COMPLETE, PARTIAL, or UNSERVED. Describe the engine steps and allocation decisions. Do not return a schema or only bullets; write a clear explanation with the actual log events.`
      : `QUESTION: ${question}

CONTEXT DATA:
${JSON.stringify(groundedContext, null, 2)}

REQUIRED: Answer ONLY based on the context above. Use markdown formatting with backticks for IDs and bold for emphasis.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': token,
          },
          signal: controller.signal,
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.3,
              topP: 0.95,
              topK: 40,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini returned HTTP ${response.status}: ${errorBody}`);
      }

      const result = await response.json();
      const answer = Array.isArray(result.candidates)
        ? result.candidates[0]?.content?.parts
            ?.filter(
              (part: unknown): part is { text: string } =>
                typeof part === 'object' &&
                part !== null &&
                'text' in part &&
                typeof (part as { text?: unknown }).text === 'string'
            )
            .map((part: { text: string }) => part.text)
            .join('')
            .trim()
        : '';

      if (!answer) {
        return NextResponse.json({
          success: true,
          answer: UNSUPPORTED_ANSWER,
          sources: ['Gemini returned empty response'],
        });
      }

      const hasRelevantData = clientId
        ? new RegExp(`\\b${clientId}\\b`, 'i').test(answer)
        : topic === 'risk'
        ? /\b(?:C\d+|status|PARTIAL|COMPLETE|UNSERVED|INSUFFICIENT|STATION|CONFLICT)\b/i.test(answer)
        : topic === 'gaps'
        ? /\b(?:F\d+|farm|segment|[A-D]|expected|actual|variance|tonne|[0-9]+\.?[0-9]*)\b/i.test(answer)
        : /\b(?:local|residual|market|F\d+|segment|EUR|value|[0-9]+\.?[0-9]*)\b/i.test(answer);

      if (!validationContext || !hasRelevantData || containsUnknownIdentifiers(answer, validationContext)) {
        return NextResponse.json({
          success: true,
          answer: UNSUPPORTED_ANSWER,
          sources: ['Response validation failed'],
        });
      }

      const topicLabels: Record<Topic, string> = {
        risk: 'At-Risk Clients Analysis',
        gaps: 'Farm & Segment Gap Analysis',
        local: 'Local Market Residuals',
      };

      let totalDataPoints = 0;
      if (clientId) {
        totalDataPoints = clientContext?.engine_log.length ?? 1;
      } else if (topic === 'risk') {
        totalDataPoints = (groundedContext as { clients_at_risk?: unknown[] } | null)?.clients_at_risk?.length ?? 0;
      } else if (topic === 'gaps') {
        totalDataPoints = (groundedContext as { farm_segment_gaps?: unknown[] } | null)?.farm_segment_gaps?.length ?? 0;
      } else {
        totalDataPoints = (groundedContext as { local_residuals?: unknown[] } | null)?.local_residuals?.length ?? 0;
      }

      return NextResponse.json({
        success: true,
        answer,
        sources: [
          clientId ? 'Data Source: Client Fulfillment Detail' : `Data Source: ${topicLabels[topic]}`,
          ...(clientId ? [`Selected Client: ${clientId}`] : []),
          `Total Data Points: ${totalDataPoints}`,
          `Model: ${model}`,
          `Generated: ${new Date().toISOString()}`,
        ],
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error && error.name === 'AbortError'
            ? 'Gemini did not respond within 30 seconds.'
            : 'The assistant is unavailable.',
      },
      { status: 503 }
    );
  }
}
