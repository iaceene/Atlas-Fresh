import {
  AtlasData,
  Segment,
  AcceptanceMode,
  AllocationRow,
  ClientResult,
  ClientStatus,
  ShortageReason,
  FarmSegmentBalance,
  PlanResult,
} from '../types';
import { createOperationLog } from '../commits/commits';

// ============================================================
// Engine factory: returns { plan, getOperation, clearLog }
// ============================================================

export function createEngine(data: AtlasData) {
  const opLog = createOperationLog();
  const { log, getOperation, clear } = opLog;

  // ----------------------------------------------------------
  // Deterministic policy helpers
  // ----------------------------------------------------------

  const SEGMENT_ORDER: Record<Segment, number> = { A: 0, B: 1, C: 2, D: 3 };

  function getCompatibleSegments(
    requested: Segment,
    mode: AcceptanceMode
  ): Segment[] {
    if (mode === 'EXACT') return [requested];
    const all: Segment[] = ['A', 'B', 'C', 'D'];
    return all.filter((s) => SEGMENT_ORDER[s] <= SEGMENT_ORDER[requested]);
  }

  function getUpgrade(requested: Segment, actual: Segment): number {
    return SEGMENT_ORDER[requested] - SEGMENT_ORDER[actual];
  }

  // ----------------------------------------------------------
  // The plan function — every decision is logged via opLog
  // ----------------------------------------------------------

  function plan(): PlanResult {
    const { farms, clients, station, referencePrices } = data;

    // ----- 1. Supply map -----
    const supply: Record<string, Record<Segment, number>> = {};
    const actualTotals: Record<Segment, number> = { A: 0, B: 0, C: 0, D: 0 };
    let totalActual = 0;
    let expectedPlan = 0;

    for (const farm of farms) {
      supply[farm.farm_id] = {
        A: farm.actual_A_t,
        B: farm.actual_B_t,
        C: farm.actual_C_t,
        D: farm.actual_D_t,
      };
      actualTotals.A += farm.actual_A_t;
      actualTotals.B += farm.actual_B_t;
      actualTotals.C += farm.actual_C_t;
      actualTotals.D += farm.actual_D_t;
      totalActual +=
        farm.actual_A_t + farm.actual_B_t + farm.actual_C_t + farm.actual_D_t;
      expectedPlan += farm.expected_daily_capacity_t;
    }

    const capacity = station.export_conditioning_capacity_t;
    let stationUsed = 0;

    log('KPI_SUMMARY', 'Initial supply snapshot built.', {
      actual_A_t: actualTotals.A,
      actual_B_t: actualTotals.B,
      actual_C_t: actualTotals.C,
      actual_D_t: actualTotals.D,
      total_actual_t: totalActual,
      expected_plan_t: expectedPlan,
      station_capacity_t: capacity,
    });

    // ----- 2. Sort clients -----
    const sortedClients = [...clients].sort((a, b) => {
      if (b.export_price_per_t_eur !== a.export_price_per_t_eur) {
        return b.export_price_per_t_eur - a.export_price_per_t_eur;
      }
      return a.client_id.localeCompare(b.client_id);
    });

    log('SORT_CLIENTS', 'Clients sorted by export price desc, then client_id.', {
      order: sortedClients.map((c) => c.client_id),
      prices: sortedClients.map((c) => ({
        client_id: c.client_id,
        price: c.export_price_per_t_eur,
      })),
    });

    // ----- 3. Allocate -----
    const allocations: AllocationRow[] = [];
    const clientResults: ClientResult[] = [];
    const exportedByFarmSegment: Record<string, Record<Segment, number>> = {};
    for (const farm of farms) {
      exportedByFarmSegment[farm.farm_id] = { A: 0, B: 0, C: 0, D: 0 };
    }

    for (const client of sortedClients) {
      let remainingDemand = client.demand_t;
      let allocatedToClient = 0;
      const compatibleSegments = getCompatibleSegments(
        client.requested_segment,
        client.acceptance_mode
      );

      log('CLIENT_START', `Processing ${client.client_id} (${client.client_name}).`, {
        client_id: client.client_id,
        acceptance_mode: client.acceptance_mode,
        requested_segment: client.requested_segment,
        demand_t: client.demand_t,
        price_eur: client.export_price_per_t_eur,
        compatible_segments: compatibleSegments,
        station_used_t: stationUsed,
        station_remaining_t: capacity - stationUsed,
      });

      type SupplyOption = {
        farm_id: string;
        segment: Segment;
        remaining: number;
        upgrade: number;
      };

      const options: SupplyOption[] = [];
      for (const farm of farms) {
        for (const seg of compatibleSegments) {
          const rem = supply[farm.farm_id][seg];
          if (rem > 0) {
            options.push({
              farm_id: farm.farm_id,
              segment: seg,
              remaining: rem,
              upgrade: getUpgrade(client.requested_segment, seg),
            });
          }
        }
      }

      options.sort((a, b) => {
        if (a.upgrade !== b.upgrade) return a.upgrade - b.upgrade;
        return a.farm_id.localeCompare(b.farm_id);
      });

      log('COMPATIBLE_OPTIONS', `Compatible supply options for ${client.client_id}.`, {
        client_id: client.client_id,
        options_count: options.length,
        options: options.map((o) => ({
          farm_id: o.farm_id,
          segment: o.segment,
          remaining_t: o.remaining,
          upgrade: o.upgrade,
        })),
      });

      for (const opt of options) {
        if (remainingDemand <= 0) break;
        if (stationUsed >= capacity) break;

        const availableFromSupply = supply[opt.farm_id][opt.segment];
        const availableStation = capacity - stationUsed;
        const take = Math.min(
          remainingDemand,
          availableFromSupply,
          availableStation
        );

        if (take > 0) {
          supply[opt.farm_id][opt.segment] -= take;
          exportedByFarmSegment[opt.farm_id][opt.segment] += take;
          stationUsed += take;
          remainingDemand -= take;
          allocatedToClient += take;

          const revenue = take * client.export_price_per_t_eur;
          allocations.push({
            farm_id: opt.farm_id,
            segment: opt.segment,
            client_id: client.client_id,
            tonnes: take,
            quality_upgrade: opt.upgrade,
            export_revenue_eur: revenue,
          });

          log(
            'ALLOCATE',
            `Allocated ${take} t ${opt.segment} from ${opt.farm_id} to ${client.client_id}.`,
            {
              farm_id: opt.farm_id,
              segment: opt.segment,
              client_id: client.client_id,
              tonnes: take,
              quality_upgrade: opt.upgrade,
              export_revenue_eur: revenue,
              station_used_after_t: stationUsed,
              remaining_demand_t: remainingDemand,
            }
          );
        }
      }

      let status: ClientStatus;
      let reason: ShortageReason = null;
      if (allocatedToClient === client.demand_t) status = 'COMPLETE';
      else if (allocatedToClient > 0) status = 'PARTIAL';
      else status = 'UNSERVED';

      if (status !== 'COMPLETE') {
        reason =
          stationUsed >= capacity
            ? 'STATION_CAPACITY_REACHED'
            : 'INSUFFICIENT_COMPATIBLE_SEGMENT';
      }

      const clientRevenue = allocatedToClient * client.export_price_per_t_eur;

      clientResults.push({
        client_id: client.client_id,
        client_name: client.client_name,
        acceptance_mode: client.acceptance_mode,
        requested_segment: client.requested_segment,
        demand_t: client.demand_t,
        export_price_per_t_eur: client.export_price_per_t_eur,
        allocated_t: allocatedToClient,
        remaining_t: remainingDemand,
        status,
        reason,
        revenue_eur: clientRevenue,
      });

      log('CLIENT_END', `${client.client_id} finished as ${status}.`, {
        client_id: client.client_id,
        allocated_t: allocatedToClient,
        remaining_t: remainingDemand,
        status,
        reason,
        revenue_eur: clientRevenue,
        station_used_t: stationUsed,
      });
    }

    // ----- 4. Local fallback -----
    const farmSegmentBalances: FarmSegmentBalance[] = [];
    let totalLocal = 0;
    let totalLocalValue = 0;

    for (const farm of farms) {
      for (const seg of ['A', 'B', 'C', 'D'] as Segment[]) {
        const originalActual =
          seg === 'A'
            ? farm.actual_A_t
            : seg === 'B'
            ? farm.actual_B_t
            : seg === 'C'
            ? farm.actual_C_t
            : farm.actual_D_t;

        const exported = exportedByFarmSegment[farm.farm_id][seg] || 0;
        const local = originalActual - exported;
        const localValue =
          local * station.local_market_ratio * referencePrices[seg];

        if (originalActual > 0 || exported > 0) {
          farmSegmentBalances.push({
            farm_id: farm.farm_id,
            segment: seg,
            actual_t: originalActual,
            exported_t: exported,
            local_t: local,
            local_value_eur: localValue,
          });
        }

        totalLocal += local;
        totalLocalValue += localValue;

        if (local > 0) {
          log('LOCAL_RESIDUAL', `${local} t ${seg} from ${farm.farm_id} went local.`, {
            farm_id: farm.farm_id,
            segment: seg,
            local_t: local,
            local_value_eur: localValue,
            reference_price_eur: referencePrices[seg],
            local_ratio: station.local_market_ratio,
          });
        }
      }
    }

    // ----- 5. KPIs -----
    const exportVolume = stationUsed;
    const exportRevenue = allocations.reduce(
      (sum, a) => sum + a.export_revenue_eur,
      0
    );
    const totalValue = exportRevenue + totalLocalValue;
    const exportRate = totalActual > 0 ? exportVolume / totalActual : 0;
    const atRiskClients = clientResults.filter(
      (c) => c.status === 'PARTIAL' || c.status === 'UNSERVED'
    ).length;

    const kpis = {
      expected_plan_t: expectedPlan,
      actual_received_t: totalActual,
      actual_A_t: actualTotals.A,
      actual_B_t: actualTotals.B,
      actual_C_t: actualTotals.C,
      actual_D_t: actualTotals.D,
      station_capacity_t: capacity,
      export_volume_t: exportVolume,
      local_volume_t: totalLocal,
      export_rate: exportRate,
      export_revenue_eur: exportRevenue,
      local_value_eur: totalLocalValue,
      total_value_eur: totalValue,
      at_risk_clients: atRiskClients,
    };

    log('KPI_SUMMARY', 'Final KPIs computed.', kpis);

    return {
      allocations,
      clients: clientResults,
      farmSegmentBalances,
      kpis,
    };
  }

  return { plan, getOperation, clearLog: clear };
}