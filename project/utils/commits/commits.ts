// ============================================================
// Operation log — separated from the engine.
// The engine imports this and pushes entries; any consumer
// (LLM, tests, UI) reads them back via getOperation().
// ============================================================

export type OperationKind =
  | 'SORT_CLIENTS'
  | 'CLIENT_START'
  | 'COMPATIBLE_OPTIONS'
  | 'ALLOCATE'
  | 'CLIENT_END'
  | 'LOCAL_RESIDUAL'
  | 'KPI_SUMMARY';

export interface Operation {
  step: number;
  kind: OperationKind;
  /** Human-readable one-liner for the LLM. */
  message: string;
  /** Structured payload — every number comes from the engine. */
  data: Record<string, unknown>;
}

export interface OperationLog {
  /** Append an entry. Step counter increments automatically. */
  log(
    kind: OperationKind,
    message: string,
    payload: Record<string, unknown>
  ): void;
  /** Read-only snapshot of everything recorded so far. */
  getOperation(): Operation[];
  /** Clear for a fresh run (useful for tests / replay). */
  clear(): void;
}

/**
 * Factory — each engine instance gets its own isolated log.
 * No globals, no cross-talk between plans.
 */
export function createOperationLog(): OperationLog {
  const operations: Operation[] = [];
  let stepCounter = 0;

  function log(
    kind: OperationKind,
    message: string,
    payload: Record<string, unknown>
  ): void {
    stepCounter += 1;
    operations.push({
      step: stepCounter,
      kind,
      message,
      data: payload,
    });
  }

  function getOperation(): Operation[] {
    return operations;
  }

  function clear(): void {
    operations.length = 0;
    stepCounter = 0;
  }

  return { log, getOperation, clear };
}