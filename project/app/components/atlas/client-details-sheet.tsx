'use client';

import React from 'react';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetContent,
} from '../ui/sheet';
import { Badge } from '../ui/badge';
import { ClientResult, AllocationRow } from '@/utils/types';
import {
  formatTonnes,
  formatCurrency,
  formatCurrencyPerTonne,
  formatQualityUpgrade,
  formatShortageReason,
} from '@/lib/formatters';
import {
  AlertCircle,
  CheckCircle2,
  Euro,
  Scale,
  Building2,
  Wheat,
  Layers,
} from 'lucide-react';

interface ClientDetailsSheetProps {
  client: ClientResult | null;
  allocations: AllocationRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailsSheet({
  client,
  allocations,
  open,
  onOpenChange,
}: ClientDetailsSheetProps) {
  if (!client) return null;

  const clientAllocations = allocations.filter(
    (a) => a.client_id === client.client_id
  );

  const statusVariant =
    client.status === 'COMPLETE'
      ? 'positive'
      : client.status === 'PARTIAL'
      ? 'warning'
      : 'destructive';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center gap-2">
          <SheetTitle>{client.client_name}</SheetTitle>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
            {client.client_id}
          </span>
        </div>
        <SheetDescription>
          Contract fulfillment profile and orchard supply allocations
        </SheetDescription>
      </SheetHeader>

      <SheetContent className="space-y-6">
        {/* Status and Shortage Banner */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Fulfillment Status
            </span>
            <Badge variant={statusVariant} className="px-2.5 py-1 text-xs">
              {client.status === 'COMPLETE' ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
              )}
              {client.status}
            </Badge>
          </div>

          {client.reason && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Shortage Cause</p>
                <p className="mt-0.5">{formatShortageReason(client.reason)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Contract Key Specs */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-slate-600" />
            Contract Terms & Volumes
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
              <span className="text-slate-500 block">Requested Segment</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                Segment {client.requested_segment}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
              <span className="text-slate-500 block">Acceptance Mode</span>
              <span className="text-sm font-semibold text-slate-900 font-mono">
                {client.acceptance_mode}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
              <span className="text-slate-500 block">Contract Demand</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {formatTonnes(client.demand_t)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/60">
              <span className="text-emerald-800 block">Allocated Volume</span>
              <span className="text-sm font-bold text-emerald-950 font-mono">
                {formatTonnes(client.allocated_t)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
              <span className="text-slate-500 block">Remaining Shortage</span>
              <span className={`text-sm font-bold font-mono ${client.remaining_t > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {formatTonnes(client.remaining_t)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
              <span className="text-slate-500 block">Agreed Price</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {formatCurrencyPerTonne(client.export_price_per_t_eur)}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-emerald-900">Total Export Revenue</span>
            <p className="text-xs text-emerald-700">
              {formatTonnes(client.allocated_t)} × {formatCurrencyPerTonne(client.export_price_per_t_eur)}
            </p>
          </div>
          <span className="text-xl font-bold font-mono text-emerald-950">
            {formatCurrency(client.revenue_eur)}
          </span>
        </div>

        {/* Allocations Table */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Wheat className="h-3.5 w-3.5 text-slate-600" />
              Allocations For This Client ({clientAllocations.length})
            </h4>
            <span className="text-xs font-mono text-slate-500">
              {clientAllocations.reduce((acc, a) => acc + a.tonnes, 0)} t total
            </span>
          </div>

          {clientAllocations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No orchard volume allocated to this client in the current plan.
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Farm</th>
                    <th className="p-2.5">Segment</th>
                    <th className="p-2.5 text-right">Volume</th>
                    <th className="p-2.5">Upgrade</th>
                    <th className="p-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientAllocations.map((alloc, idx) => (
                    <tr key={`${alloc.farm_id}-${alloc.segment}-${idx}`} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-mono font-semibold text-slate-800">
                        {alloc.farm_id}
                      </td>
                      <td className="p-2.5 font-mono">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                          {alloc.segment}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                        {formatTonnes(alloc.tonnes)}
                      </td>
                      <td className="p-2.5">
                        <span className="text-slate-600">
                          {formatQualityUpgrade(alloc.quality_upgrade)}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-medium text-emerald-800">
                        {formatCurrency(alloc.export_revenue_eur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
