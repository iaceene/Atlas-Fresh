// ============================================================
// Domain primitives
// ============================================================

export type Segment = 'A' | 'B' | 'C' | 'D';
export type AcceptanceMode = 'EXACT' | 'MINIMUM';

// ============================================================
// Workbook input types (parsed from the .xlsx)
// ============================================================

export interface Farm {
  farm_id: string;
  farm_name: string;
  expected_daily_capacity_t: number;
  expected_A_pct: number;
  expected_B_pct: number;
  expected_C_pct: number;
  expected_D_pct: number;
  actual_A_t: number;
  actual_B_t: number;
  actual_C_t: number;
  actual_D_t: number;
}

export interface Client {
  client_id: string;
  client_name: string;
  acceptance_mode: AcceptanceMode;
  requested_segment: Segment;
  demand_t: number;
  export_price_per_t_eur: number;
}

export interface Station {
  station_id: string;
  export_conditioning_capacity_t: number;
  local_market_ratio: number;
}

export type ReferencePrices = Record<Segment, number>;

export interface AtlasData {
  farms: Farm[];
  clients: Client[];
  station: Station;
  referencePrices: ReferencePrices;
}

// ============================================================
// Engine output types
// ============================================================

/** COMPLETE = fully served, PARTIAL = some but not all, UNSERVED = nothing. */
export type ClientStatus = 'COMPLETE' | 'PARTIAL' | 'UNSERVED';

/**
 * Why a client is not COMPLETE.
 * - STATION_CAPACITY_REACHED: the 500 t export line is full.
 * - INSUFFICIENT_COMPATIBLE_SEGMENT: no more compatible farm supply exists.
 * - null: client is COMPLETE.
 */
export type ShortageReason =
  | 'STATION_CAPACITY_REACHED'
  | 'INSUFFICIENT_COMPATIBLE_SEGMENT'
  | null;

/**
 * One farm-segment → client assignment.
 * `quality_upgrade` = segment order gap (0 = exact, 1 = one step better, etc.).
 */
export interface AllocationRow {
  farm_id: string;
  segment: Segment;
  client_id: string;
  tonnes: number;
  quality_upgrade: number;
  export_revenue_eur: number;
}

/** Per-client summary produced by the engine. */
export interface ClientResult {
  client_id: string;
  client_name: string;
  acceptance_mode: AcceptanceMode;
  requested_segment: Segment;
  demand_t: number;
  export_price_per_t_eur: number;
  allocated_t: number;
  remaining_t: number;
  status: ClientStatus;
  reason: ShortageReason;
  revenue_eur: number;
}

/** Per-farm, per-segment closing balance after export allocation. */
export interface FarmSegmentBalance {
  farm_id: string;
  segment: Segment;
  actual_t: number;
  exported_t: number;
  local_t: number;
  local_value_eur: number;
}

/** All headline numbers the UI and assistant need. */
export interface PlanKpis {
  expected_plan_t: number;
  actual_received_t: number;
  actual_A_t: number;
  actual_B_t: number;
  actual_C_t: number;
  actual_D_t: number;
  station_capacity_t: number;
  export_volume_t: number;
  local_volume_t: number;
  export_rate: number;
  export_revenue_eur: number;
  local_value_eur: number;
  total_value_eur: number;
  at_risk_clients: number;
}

/** The full deterministic plan returned by planDaily(). */
export interface PlanResult {
  allocations: AllocationRow[];
  clients: ClientResult[];
  farmSegmentBalances: FarmSegmentBalance[];
  kpis: PlanKpis;
}

export interface PlanApiResponse {
  success: boolean;
  plan?: PlanResult;
  error?: string;
}

export interface AskAiRequest {
  question: string;
}

export interface AskAiResponse {
  success: boolean;
  answer?: string;
  sources?: string[];
  error?: string;
}