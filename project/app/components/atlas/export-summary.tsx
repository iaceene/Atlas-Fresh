import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { PlanKpis } from '@/utils/types';
import { formatTonnes, formatPercent, formatCurrency } from '@/lib/formatters';
import { Truck, Store, ArrowUpRight } from 'lucide-react';

interface ExportSummaryProps {
  kpis: PlanKpis;
}

export function ExportSummary({ kpis }: ExportSummaryProps) {
  const exportRatePct = kpis.export_rate <= 1 ? kpis.export_rate * 100 : kpis.export_rate;

  return (
    <Card id="export-vs-local-card" className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Export vs Local Allocation
          </CardTitle>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            {formatPercent(kpis.export_rate)} Export Rate
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Export Capacity Utilization</span>
            <span className="font-mono">{formatTonnes(kpis.export_volume_t)} / {formatTonnes(kpis.station_capacity_t)}</span>
          </div>
          <Progress value={exportRatePct} max={100} indicatorClassName="bg-emerald-600" />
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Export Box */}
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 space-y-1">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-700" />
                Export Stream
              </span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
            <p className="text-xl font-bold text-emerald-950 font-mono">
              {formatTonnes(kpis.export_volume_t)}
            </p>
            <div className="flex items-center justify-between text-xs text-emerald-700/90 pt-1 border-t border-emerald-200/50">
              <span>Revenue:</span>
              <span className="font-semibold font-mono">{formatCurrency(kpis.export_revenue_eur)}</span>
            </div>
          </div>

          {/* Local Market Box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Store className="h-4 w-4 text-slate-600" />
                Local Market
              </span>
            </div>
            <p className="text-xl font-bold text-slate-900 font-mono">
              {formatTonnes(kpis.local_volume_t)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
              <span>Value:</span>
              <span className="font-semibold font-mono">{formatCurrency(kpis.local_value_eur)}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Packing station reached full export limit ({formatTonnes(kpis.station_capacity_t)}). Unassigned Segment D fruit from 4 orchards was routed to domestic buyers at average recovery rates.
        </p>
      </CardContent>
    </Card>
  );
}
