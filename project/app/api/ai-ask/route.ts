import { NextResponse } from 'next/server';
import path from 'node:path';
import type { AskAiRequest } from '@/utils/types';
import { parseAtlasWorkbook } from '@/utils/parser/parser';
import { createEngine } from '@/utils/engine/engine';

const UNSUPPORTED_ANSWER =
  'That information is not available in the supplied inputs or computed plan.';

// Response shapes from external LLMs are handled dynamically below.

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

  const atRiskClients =
    topic === 'risk'
      ? plan.clients
          .filter((client) => client.status !== 'COMPLETE')
          .map(({ client_id, status, reason, allocated_t, demand_t }) => ({
            client_id,
            status,
            reason,
            allocated_t,
            demand_t,
            shortage_t: demand_t - allocated_t,
          }))
      : [];

  const gaps =
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
              expected_t: Math.round(expected_t * 100) / 100,
              actual_t: Math.round(actual_t * 100) / 100,
              variance_t: Math.round((actual_t - expected_t) * 100) / 100,
            };
          })
        )
      : [];

  const residuals =
    topic === 'local'
      ? plan.farmSegmentBalances
          .filter((balance) => balance.local_t > 0)
          .map((balance) => ({
            farm_id: balance.farm_id,
            segment: balance.segment,
            local_t: Math.round(balance.local_t * 100) / 100,
            local_value_eur: Math.round(balance.local_value_eur * 100) / 100,
            reference_price_eur: Math.round((data.referencePrices[balance.segment] || 0) * 100) / 100,
          }))
      : [];

  const context = {
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
    kpis: plan.kpis,
    clients_at_risk: atRiskClients,
    farm_segment_gaps: gaps,
    local_residuals: residuals,
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
    metadata: {
      allowed_client_ids: data.clients.map((client) => client.client_id),
      allowed_farm_ids: data.farms.map((farm) => farm.farm_id),
      allowed_segments: ['A', 'B', 'C', 'D'],
      valid_statuses: ['COMPLETE', 'PARTIAL', 'UNSERVED'],
      valid_reasons: [
        'INSUFFICIENT_COMPATIBLE_SEGMENT',
        'STATION_CAPACITY_REACHED',
        'ALLOCATION_CONFLICT',
      ],
    },
  };

  return context;
}

function buildClientContext(clientId: string) {
  const workbookPath = path.join(
    process.cwd(),
    'public',
    'Atlas_Fresh_Production_Commercial_Data.xlsx'
  );
  const data = parseAtlasWorkbook(workbookPath);
  const engine = createEngine(data);
  const plan = engine.plan();
  const operations = engine.getOperation();

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
      selected_client_id: clientId,
      valid_statuses: ['COMPLETE', 'PARTIAL', 'UNSERVED'],
      valid_reasons: [
        'INSUFFICIENT_COMPATIBLE_SEGMENT',
        'STATION_CAPACITY_REACHED',
        'ALLOCATION_CONFLICT',
      ],
    },
  };
}

function containsUnknownIdentifiers(
  answer: string,
  context: { metadata: { allowed_client_ids: string[]; allowed_farm_ids: string[] } }
) {
  const identifiers = answer.match(/\b(?:C|F)\d+\b/g) ?? [];
  const allowed = new Set([
    ...context.metadata.allowed_client_ids,
    ...context.metadata.allowed_farm_ids,
  ]);
  return identifiers.some((identifier) => !allowed.has(identifier));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AskAiRequest;
    const question = body.question?.trim();
    const clientId = body.clientId?.trim();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: 'A question is required.',
        },
        { status: 400 }
      );
    }

    const topic = clientId ? 'risk' : getQuestionTopic(question);

    if (!topic) {
      return NextResponse.json({
        success: true,
        answer: UNSUPPORTED_ANSWER,
        sources: [],
      });
    }

    const clientContext = clientId ? buildClientContext(clientId) : null;
    const groundedContext = clientId ? null : buildGroundedContext(topic);
    const validationContext = clientId ? clientContext : groundedContext;

    if (clientId && !clientContext) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown client id: ${clientId}`,
        },
        { status: 400 }
      );
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const token = process.env.LLM_TOKEN;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30_000);

    try {
      if (!token) {
        throw new Error('Missing LLM token in environment (LLM_TOKEN)');
      }

      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const systemPrompt = clientId
        ? `You are an analytical assistant for daily operational planning in agricultural export logistics.
    Your role is to explain one selected client fulfillment row using only the provided context and the engine logs.

    CORE RULES:
    1. ONLY use data from the context provided—no external knowledge
    2. NEVER calculate, estimate, or make assumptions beyond the provided fields
    3. NEVER recommend changes or actions
    4. Use MARKDOWN formatting for clarity (bold for emphasis, lists, etc.)
    5. Every number, ID, and status MUST come from the provided context
    6. Always cite the selected client ID and any allocation rows you mention
    7. If data is unavailable, reply exactly: "${UNSUPPORTED_ANSWER}"

    RESPONSE FORMAT GUIDELINES:
    - Start with the client ID and status
    - Explain what the engine did step by step from the logs
    - Explain why the client ended up COMPLETE, PARTIAL, or UNSERVED
    - If a shortage reason exists, explain it from the log events
    - Mention the client's requested segment and acceptance mode
    - Mention the relevant engine events such as SORT_CLIENTS, CLIENT_START, COMPATIBLE_OPTIONS, ALLOCATE, CLIENT_END
    - Use inline code formatting for identifiers (e.g., \`C01\`, \`F02\`, Segment \`A\`)`
        : `You are an analytical assistant for daily operational planning in agricultural export logistics.
    Your role is to explain deterministic allocation plans using provided data—do NOT create, calculate, or recommend changes.

    CORE RULES:
    1. ONLY use data from the context provided—no external knowledge
    2. NEVER calculate, estimate, or make assumptions
    3. NEVER recommend changes or actions
    4. Use MARKDOWN formatting for clarity (bold for emphasis, lists, etc.)
    5. Every number, ID, and status MUST come from the provided context
    6. Always cite sources: use Client IDs (C###), Farm IDs (F###), Segments (A/B/C/D)
    7. If data is unavailable, reply exactly: "${UNSUPPORTED_ANSWER}"

    RESPONSE FORMAT GUIDELINES:
    - For client risk analysis: Use bullet lists with Client ID, Status, Reason (from context)
    - For gap analysis: Organize by Farm ID and Segment, show expected vs actual in tonnes
    - For local residuals: Show Farm, Segment, Quantity in tonnes, and estimated EUR value
    - Use inline code formatting for identifiers (e.g., \`C01\`, \`F02\`, Segment \`A\`)

    Examples of proper formatted responses:
    * **Client ID \`C02\`**: Status is \`PARTIAL\` due to \`INSUFFICIENT_COMPATIBLE_SEGMENT\`.
    * **Farm \`F01\` Segment \`A\`**: Expected 50.00 t, Actual 45.25 t, Variance: -4.75 t`;

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

      const geminiRequest = {
        system_instruction: {
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },

        contents: [
          {
            role: 'user',
            parts: [
              {
                text: userPrompt,
              },
            ],
          },
        ],

        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.3, // Lower temperature for consistent, fact-based responses
          topP: 0.95,
          topK: 40,
        },
      };

      const response = await fetch(endpoint, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': token,
        },

        signal: controller.signal,

        body: JSON.stringify(geminiRequest),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        throw new Error(
          `Gemini returned HTTP ${response.status}: ${errorBody}`
        );
      }

      const result = await response.json();

      let answer: string | undefined;

      if (Array.isArray(result.candidates)) {
        const firstCandidate = result.candidates[0];

        if (firstCandidate?.content?.parts) {
          answer = firstCandidate.content.parts
            .filter(
              (part: unknown): part is { text: string } =>
                typeof part === 'object' &&
                part !== null &&
                'text' in part &&
                typeof (part as { text?: unknown }).text === 'string'
            )
            .map((part: { text: string }) => part.text)
            .join('')
            .trim();
        }
      }

      if (!answer) {
        return NextResponse.json({
          success: true,
          answer: UNSUPPORTED_ANSWER,
          sources: ['Gemini returned empty response'],
        });
      }

      // Validate that response contains actual data from context
      const hasRelevantData = clientId
        ? new RegExp(`\\b${clientId}\\b`, 'i').test(answer)
        : topic === 'risk'
        ? /\b(?:C\d+|status|PARTIAL|COMPLETE|UNSERVED|INSUFFICIENT|STATION|CONFLICT)\b/i.test(answer)
        : topic === 'gaps'
        ? /\b(?:F\d+|farm|segment|[A-D]|expected|actual|variance|tonne|[0-9]+\.?[0-9]*)\b/i.test(answer)
        : /\b(?:local|residual|market|F\d+|segment|EUR|value|[0-9]+\.?[0-9]*)\b/i.test(answer);

      if (!hasRelevantData || containsUnknownIdentifiers(answer, validationContext!)) {
        return NextResponse.json({
          success: true,
          answer: UNSUPPORTED_ANSWER,
          sources: ['Response validation failed'],
        });
      }

      const topicLabels: Record<string, string> = {
        risk: 'At-Risk Clients Analysis',
        gaps: 'Farm & Segment Gap Analysis',
        local: 'Local Market Residuals',
      };

      return NextResponse.json({
        success: true,
        answer,
        sources: [
          clientId
            ? 'Data Source: Client Fulfillment Detail'
            : `Data Source: ${topicLabels[topic]}`,
          ...(clientId ? [`Selected Client: ${clientId}`] : []),
          `Total Data Points: ${
            clientId
              ? (clientContext?.engine_log.length ?? 1)
              : topic === 'risk'
              ? groundedContext!.clients_at_risk.length
              : topic === 'gaps'
              ? groundedContext!.farm_segment_gaps.length
              : groundedContext!.local_residuals.length
          }`,
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
            : 'The assistant is unavailable. Check your GEMINI_MODEL and LLM_TOKEN and try again.',
      },
      { status: 503 }
    );
  }
}