import { NextResponse } from 'next/server';
import type { AskAiRequest } from '@/utils/types';
import { getAtlasContext } from '@/utils/atlas-context';

const UNSUPPORTED_ANSWER =
  'That information is not available in the supplied inputs or computed plan.';

type Topic = 'risk' | 'gaps' | 'local';
type GeneralTopic = Topic | 'general';

type ValidationContext = {
  metadata: {
    allowed_client_ids: string[];
    allowed_farm_ids: string[];
  };
};

function getQuestionTopic(question: string): GeneralTopic {
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

  return 'general';
}

function containsUnknownIdentifiers(answer: string, context: ValidationContext) {
  const identifiers = answer.match(/\b(?:C|F)\d+\b/g) ?? [];
  const allowed = new Set([
    ...context.metadata.allowed_client_ids,
    ...context.metadata.allowed_farm_ids,
  ]);
  return identifiers.some((identifier) => !allowed.has(identifier));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/\.00$/, '');
}

function buildFallbackAnswer(
  topic: Topic | 'general',
  groundedContext: unknown
): string | null {
  if (topic === 'general') return null;
  if (!groundedContext || typeof groundedContext !== 'object') return null;

  const context = groundedContext as {
    plan_summary?: {
      expected_plan_t?: number;
      actual_received_t?: number;
      export_volume_t?: number;
      local_volume_t?: number;
      local_value_eur?: number;
      at_risk_count?: number;
    };
    farm_segment_gaps?: Array<{
      farm_id: string;
      segment: string;
      expected_t: number;
      actual_t: number;
      variance_t: number;
    }>;
    local_residuals?: Array<{
      farm_id: string;
      segment: string;
      local_t: number;
      local_value_eur: number;
      reference_price_eur: number;
    }>;
  };

  if (topic === 'gaps' && Array.isArray(context.farm_segment_gaps)) {
    const topGaps = [...context.farm_segment_gaps]
      .sort((a, b) => Math.abs(b.variance_t) - Math.abs(a.variance_t))
      .slice(0, 5);

    const lines = [
      '### Farm and segment gaps',
      'The largest gaps are the farm/segment pairs with the biggest variance between expected and actual tonnage.',
      '',
      ...topGaps.map(
        (gap) =>
          `- **${gap.farm_id} / ${gap.segment}**: expected ${formatNumber(gap.expected_t)} t, actual ${formatNumber(gap.actual_t)} t, variance ${gap.variance_t >= 0 ? '+' : ''}${formatNumber(gap.variance_t)} t`
      ),
    ];

    const planSummary = context.plan_summary;
    if (planSummary?.expected_plan_t !== undefined && planSummary?.actual_received_t !== undefined) {
      lines.push(
        '',
        `**Plan summary:** expected ${formatNumber(planSummary.expected_plan_t)} t, actual received ${formatNumber(planSummary.actual_received_t)} t.`
      );
    }

    return lines.join('\n');
  }

  if (topic === 'local' && Array.isArray(context.local_residuals)) {
    const topResiduals = [...context.local_residuals]
      .sort((a, b) => b.local_value_eur - a.local_value_eur)
      .slice(0, 5);

    const lines = [
      '### Local fruit value',
      'The supplied plan shows local residual tonnage on the farm/segment pairs below; the value is the estimated local market value recorded in the context.',
      '',
      ...topResiduals.map(
        (row) =>
          `- **${row.farm_id} / ${row.segment}**: ${formatNumber(row.local_t)} t local, estimated value €${formatNumber(row.local_value_eur)}`
      ),
    ];

    const planSummary = context.plan_summary;
    if (planSummary?.local_volume_t !== undefined && planSummary?.local_value_eur !== undefined) {
      lines.push(
        '',
        `**Total local volume:** ${formatNumber(planSummary.local_volume_t)} t`,
        `**Total local value:** €${formatNumber(planSummary.local_value_eur)}`
      );
    }

    return lines.join('\n');
  }

  if (topic === 'risk' && Array.isArray((groundedContext as { clients_at_risk?: unknown[] }).clients_at_risk)) {
    const riskContext = groundedContext as {
      clients_at_risk: Array<{
        client_id: string;
        status: string;
        reason: string | null;
        allocated_t: number;
        demand_t: number;
        shortage_t: number;
      }>;
      plan_summary?: { at_risk_count?: number; complete_count?: number; total_clients?: number };
    };

    const topClients = [...riskContext.clients_at_risk].slice(0, 5);
    const lines = [
      '### At-risk clients',
      'The plan identifies the following clients as not fully complete:',
      '',
      ...topClients.map(
        (client) =>
          `- **${client.client_id}**: ${client.status}, shortage ${formatNumber(client.shortage_t)} t${client.reason ? `, reason ${client.reason}` : ''}`
      ),
    ];

    const planSummary = riskContext.plan_summary;
    if (planSummary?.at_risk_count !== undefined) {
      lines.push('', `**At-risk clients:** ${planSummary.at_risk_count}`);
    }

    return lines.join('\n');
  }

  return null;
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

function buildGeneralContext(atlasContext: Awaited<ReturnType<typeof getAtlasContext>>) {
  const { data, plan, operations, source, contextId } = atlasContext;

  return {
    assistant_identity: 'Atlas Fresh operational planning assistant',
    assistant_role:
      'Answer casual questions and explain the current agricultural export plan using the supplied workspace context.',
    current_context: {
      context_id: contextId,
      source_label: source.label,
      source_kind: source.kind,
      file_name: source.fileName ?? null,
      created_at: source.createdAt,
    },
    plan_summary: {
      expected_plan_t: Math.round(plan.kpis.expected_plan_t * 100) / 100,
      actual_received_t: Math.round(plan.kpis.actual_received_t * 100) / 100,
      export_volume_t: Math.round(plan.kpis.export_volume_t * 100) / 100,
      local_volume_t: Math.round(plan.kpis.local_volume_t * 100) / 100,
      export_rate: Math.round(plan.kpis.export_rate * 10000) / 10000,
      station_capacity_t: Math.round(plan.kpis.station_capacity_t * 100) / 100,
      total_clients: plan.clients.length,
      total_farms: data.farms.length,
      at_risk_count: plan.kpis.at_risk_clients,
      export_revenue_eur: Math.round(plan.kpis.export_revenue_eur),
      local_value_eur: Math.round(plan.kpis.local_value_eur),
      total_value_eur: Math.round(plan.kpis.total_value_eur),
    },
    what_is_exported: {
      top_allocations_by_revenue: [...plan.allocations]
        .sort((a, b) => b.export_revenue_eur - a.export_revenue_eur)
        .slice(0, 5)
        .map((allocation) => ({
          client_id: allocation.client_id,
          farm_id: allocation.farm_id,
          segment: allocation.segment,
          tonnes: Math.round(allocation.tonnes * 100) / 100,
          quality_upgrade: Math.round(allocation.quality_upgrade * 100) / 100,
          export_revenue_eur: Math.round(allocation.export_revenue_eur),
        })),
    },
    what_is_going_on_in_logs: operations.slice(-12).map((operation) => ({
      step: operation.step,
      kind: operation.kind,
      message: operation.message,
      data: operation.data,
    })),
    metadata: {
      allowed_client_ids: data.clients.map((client) => client.client_id),
      allowed_farm_ids: data.farms.map((farm) => farm.farm_id),
      allowed_segments: ['A', 'B', 'C', 'D'] as const,
    },
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

    const atlasContext = await getAtlasContext(contextId);
    const clientContext = clientId ? buildClientContext(clientId, atlasContext) : null;
    const generalContext = !clientId && topic === 'general' ? buildGeneralContext(atlasContext) : null;
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

    if (topic === 'general' && generalContext) {
      const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
      const token = process.env.LLM_TOKEN;
      if (!token) {
        throw new Error('Missing LLM token in environment (LLM_TOKEN)');
      }

      const systemPrompt = `You are Atlas Fresh's operational planning assistant.
You help with casual conversation and with questions about the current agricultural export plan.

CORE RULES:
1. Answer naturally and briefly when the user is just greeting or chatting
2. When the user asks about the plan, use the provided Atlas Fresh context
3. ONLY use the provided context for plan-specific details
4. Do not reveal internal reasoning or chain-of-thought
5. Use markdown if it improves clarity
6. If you mention clients, farms, segments, exports, or logs, keep it grounded in the provided context`;

      const userPrompt = `USER QUESTION: ${question}

ATLAS FRESH CONTEXT:
${JSON.stringify(generalContext, null, 2)}

RESPONSE GUIDANCE:
- If this is a casual question such as hello, greet the user naturally.
- If this asks about Atlas Fresh, explain the current export plan, what is being exported, and what the latest log entries show.
- Keep the answer concise, useful, and grounded in the context.`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.5,
            max_tokens: 700,
            top_p: 0.95,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`OpenRouter returned HTTP ${response.status}: ${errorBody}`);
        }

        const result = await response.json();
        const answer =
          typeof result?.choices?.[0]?.message?.content === 'string'
            ? result.choices[0].message.content.trim()
            : '';

        return NextResponse.json({
          success: true,
          answer:
            answer ||
            'Hello — I am the Atlas Fresh operational planning assistant. I can help with exports, client risk, farm/segment gaps, and log details.',
          sources: [
            'Data Source: Atlas Fresh General Context',
            `Model: ${model}`,
            `Generated: ${new Date().toISOString()}`,
          ],
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
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
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1024,
          top_p: 0.95,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter returned HTTP ${response.status}: ${errorBody}`);
      }

      const result = await response.json();
      const answer =
        typeof result?.choices?.[0]?.message?.content === 'string'
          ? result.choices[0].message.content.trim()
          : '';

      if (!answer) {
        const fallbackAnswer = buildFallbackAnswer(topic, groundedContext);
        if (fallbackAnswer) {
          return NextResponse.json({
            success: true,
            answer: fallbackAnswer,
            sources: ['Fallback summary from computed plan'],
          });
        }

        return NextResponse.json({
          success: true,
          answer: UNSUPPORTED_ANSWER,
          sources: ['OpenRouter returned empty response'],
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
        const fallbackAnswer = buildFallbackAnswer(topic, groundedContext);
        if (fallbackAnswer) {
          return NextResponse.json({
            success: true,
            answer: fallbackAnswer,
            sources: ['Fallback summary from computed plan'],
          });
        }

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
      const topicLabel = topic === 'general' ? 'Atlas Fresh General Conversation' : topicLabels[topic];

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
          clientId ? 'Data Source: Client Fulfillment Detail' : `Data Source: ${topicLabel}`,
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
            ? 'OpenRouter did not respond within 30 seconds.'
            : 'The assistant is unavailable.',
      },
      { status: 503 }
    );
  }
}
