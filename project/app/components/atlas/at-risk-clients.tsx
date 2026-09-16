import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ClientResult } from '@/utils/types';
import { formatTonnes, formatShortageReason } from '@/lib/formatters';
import { AlertTriangle, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';

interface AtRiskClientsProps {
  clients: ClientResult[];
  onSelectClient: (client: ClientResult) => void;
}

export function AtRiskClients({ clients, onSelectClient }: AtRiskClientsProps) {
  const atRiskClients = clients.filter((c) => c.status !== 'COMPLETE');

  if (atRiskClients.length === 0) {
    return (
      <Card id="at-risk-clients-card" className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              All clients are fully allocated.
            </p>
            <p className="text-xs text-emerald-700">
              Every client demand has been 100% satisfied with zero remaining shortage.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="at-risk-clients-card" className="border-amber-200/90 ">
      <CardHeader className="py-3 px-4 border-b border-amber-200/50 ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <CardTitle className="text-sm font-semibold text-amber-900">
              At-Risk Clients ({atRiskClients.length})
            </CardTitle>
          </div>
          <span className="text-xs font-medium text-amber-800">
            Click client row to inspect allocation detail
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-amber-200/40">
        {atRiskClients.map((client) => {
          return (
            <button
              key={client.client_id}
              type="button"
              onClick={() => onSelectClient(client)}
              className="w-full flex items-center justify-between p-3 px-4 text-left transition-colors hover:bg-amber-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
              aria-label={`View allocation details for ${client.client_name}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 truncate">
                    {client.client_name}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    ({client.client_id})
                  </span>
                  <Badge variant={client.status === 'PARTIAL' ? 'warning' : 'destructive'} className="text-[11px] py-0 px-2">
                    {client.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-amber-900">
                  <span className="font-mono font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    {formatTonnes(client.remaining_t)} shortage
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-600 shrink-0" />
                    {formatShortageReason(client.reason)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-amber-900 shrink-0 ml-2">
                <span className="hidden md:inline">Inspect</span>
                <ChevronRight className="h-4 w-4 text-amber-700" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
