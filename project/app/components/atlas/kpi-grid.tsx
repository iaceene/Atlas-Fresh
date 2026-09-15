import React from 'react';
import { PlanKpis } from '@/utils/types';
import { KpiCard } from './kpi-card';
import {
  formatTonnes,
  formatCurrency,
  formatPercent,
} from '@/lib/formatters';
import {
  Package,
  Truck,
  Percent,
  AlertTriangle,
  Euro,
  Store,
  Wallet,
  Factory,
} from 'lucide-react';

interface KpiGridProps {
  kpis: PlanKpis;
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <section id="kpi-section" aria-label="Key Performance Indicators" className="space-y-3">
      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          id="kpi-actual-received"
          title="Actual Received"
          value={formatTonnes(kpis.actual_received_t)}
          subtitle={`Expected Plan: ${formatTonnes(kpis.expected_plan_t)} (${formatPercent(
            kpis.actual_received_t / (kpis.expected_plan_t || 1)
          )})`}
          icon={<Package className="h-5 w-5" />}
          variant="default"
        />

        <KpiCard
          id="kpi-export-volume"
          title="Export Volume"
          value={formatTonnes(kpis.export_volume_t)}
          subtitle={`Station Limit: ${formatTonnes(kpis.station_capacity_t)} (100% capacity)`}
          icon={<Truck className="h-5 w-5" />}
          variant="positive"
        />

        <KpiCard
          id="kpi-export-rate"
          title="Export Rate"
          value={formatPercent(kpis.export_rate)}
          subtitle={`Local Overflow: ${formatTonnes(kpis.local_volume_t)}`}
          icon={<Percent className="h-5 w-5" />}
          variant="default"
        />

        <KpiCard
          id="kpi-at-risk"
          title="At-Risk Clients"
          value={`${kpis.at_risk_clients}`}
          subtitle="Partial volume or capacity shortage"
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={kpis.at_risk_clients > 0 ? 'warning' : 'positive'}
          highlight={kpis.at_risk_clients > 0}
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          id="kpi-export-revenue"
          title="Export Revenue"
          value={formatCurrency(kpis.export_revenue_eur)}
          subtitle="From 500 t allocated contracts"
          icon={<Euro className="h-4 w-4" />}
          variant="neutral"
        />

        <KpiCard
          id="kpi-local-value"
          title="Local Market Value"
          value={formatCurrency(kpis.local_value_eur)}
          subtitle={`Secondary recovery (${formatTonnes(kpis.local_volume_t)})`}
          icon={<Store className="h-4 w-4" />}
          variant="neutral"
        />

        <KpiCard
          id="kpi-total-value"
          title="Total Commercial Value"
          value={formatCurrency(kpis.total_value_eur)}
          subtitle="Export revenue + Local return"
          icon={<Wallet className="h-4 w-4" />}
          variant="positive"
        />

        <KpiCard
          id="kpi-station-capacity"
          title="Station Capacity"
          value={formatTonnes(kpis.station_capacity_t)}
          subtitle={`${formatTonnes(kpis.export_volume_t)} allocated (0 t headroom)`}
          icon={<Factory className="h-4 w-4" />}
          variant="neutral"
        />
      </div>
    </section>
  );
}
