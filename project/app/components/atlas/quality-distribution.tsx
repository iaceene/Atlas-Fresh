import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { PlanKpis } from '@/utils/types';
import { formatTonnes, formatPercent } from '@/lib/formatters';

interface QualityDistributionProps {
  kpis: PlanKpis;
}

export function QualityDistribution({ kpis }: QualityDistributionProps) {
  const total = kpis.actual_received_t || 1;

  const segments = [
    {
      segment: 'A',
      label: 'Segment A (Premium)',
      tonnes: kpis.actual_A_t,
      color: 'bg-emerald-600',
      textColor: 'text-emerald-800',
      badgeBg: 'bg-emerald-50 border-emerald-200',
      description: 'Highest export specification, strict color & blemish criteria',
    },
    {
      segment: 'B',
      label: 'Segment B (Standard Export)',
      tonnes: kpis.actual_B_t,
      color: 'bg-teal-600',
      textColor: 'text-teal-800',
      badgeBg: 'bg-teal-50 border-teal-200',
      description: 'Standard retail specification with high international demand',
    },
    {
      segment: 'C',
      label: 'Segment C (Commercial)',
      tonnes: kpis.actual_C_t,
      color: 'bg-amber-600',
      textColor: 'text-amber-800',
      badgeBg: 'bg-amber-50 border-amber-200',
      description: 'Value pack / secondary export tier',
    },
    {
      segment: 'D',
      label: 'Segment D (Processing / Economy)',
      tonnes: kpis.actual_D_t,
      color: 'bg-slate-600',
      textColor: 'text-slate-800',
      badgeBg: 'bg-slate-100 border-slate-200',
      description: 'Economy export & local market recovery grade',
    },
  ];

  return (
    <Card id="quality-distribution-card" className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Quality Received by Segment
          </CardTitle>
          <span className="text-xs text-slate-500 font-mono">
            Total {formatTonnes(kpis.actual_received_t)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {segments.map((seg) => {
          const pct = (seg.tonnes / total) * 100;
          return (
            <div key={seg.segment} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded font-bold text-xs border ${seg.badgeBg} ${seg.textColor}`}
                  >
                    {seg.segment}
                  </span>
                  <span className="text-slate-700">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-semibold text-slate-900">
                    {formatTonnes(seg.tonnes)}
                  </span>
                  <span className="text-slate-400 w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                <div
                  className={`h-full transition-all duration-300 ${seg.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
