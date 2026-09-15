'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PlanResult, ClientResult } from '@/utils/types';
import { getPlan } from '@/lib/api/data';
import { DashboardHeader } from './dashboard-header';
import { KpiGrid } from './kpi-grid';
import { QualityDistribution } from './quality-distribution';
import { ExportSummary } from './export-summary';
import { AtRiskClients } from './at-risk-clients';
import { ClientTable } from './client-table';
import { ClientDetailsSheet } from './client-details-sheet';
import { AllocationTable } from './allocation-table';
import { FarmBalanceTable } from './farm-balance-table';
import { LoadingDashboard } from './loading-dashboard';
import { ErrorState } from './error-state';
import { AiAssistantSheet } from './ai-assistant-sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { LayoutDashboard, Users, Wheat, Layers } from 'lucide-react';

interface AtlasDashboardProps {
  initialPlan?: PlanResult | null;
}

export function AtlasDashboard({ initialPlan }: AtlasDashboardProps) {
  const [plan, setPlan] = useState<PlanResult | null>(initialPlan || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialPlan);
  const [error, setError] = useState<string | null>(null);

  // Panels state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch plan from Next.js API /api/data
  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPlan();
      if (response.success && response.plan) {
        setPlan(response.plan);
      } else {
        throw new Error(response.error || 'Failed to load plan');
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load today's plan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialPlan) {
      loadPlan();
    }
  }, [initialPlan, loadPlan]);

  const handleSelectClient = (client: ClientResult) => {
    setSelectedClient(client);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80 text-slate-900 font-sans">
      {/* Header Bar */}
      <DashboardHeader
        onChatClick={() => setIsChatOpen(true)}
        onRefresh={loadPlan}
        isLoading={isLoading}
        hasPlan={Boolean(plan)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isLoading && !plan ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2">
              <span className="animate-pulse font-medium">Fetching today's operations allocation plan...</span>
            </div>
            <LoadingDashboard />
          </div>
        ) : error && !plan ? (
          <ErrorState message={error} onRetry={loadPlan} />
        ) : plan ? (
          <div className="space-y-6">
            {/* Top KPI Section: Shown globally on the planner */}
            <KpiGrid kpis={plan.kpis} />

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="border-b border-slate-200 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <TabsList className="h-10">
                  <TabsTrigger value="overview" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="clients" className="gap-2">
                    <Users className="h-4 w-4" />
                    <span>Clients</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                      {plan.clients.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="allocations" className="gap-2">
                    <Layers className="h-4 w-4" />
                    <span>Allocations</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                      {plan.allocations.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="farms" className="gap-2">
                    <Wheat className="h-4 w-4" />
                    <span>Farm Balances</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                      {plan.farmSegmentBalances.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Capacity: <strong className="font-mono text-slate-800">{plan.kpis.station_capacity_t} t</strong></span>
                  <span>•</span>
                  <span>Export: <strong className="font-mono text-emerald-700">{plan.kpis.export_volume_t} t</strong></span>
                  <span>•</span>
                  <span>Local: <strong className="font-mono text-amber-700">{plan.kpis.local_volume_t} t</strong></span>
                </div>
              </div>

              {/* TAB 1: OVERVIEW */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                {/* At-Risk Clients Warning Banner */}
                <AtRiskClients
                  clients={plan.clients}
                  onSelectClient={handleSelectClient}
                />

                {/* Grid: Quality Distribution & Export Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <QualityDistribution kpis={plan.kpis} />
                  <ExportSummary kpis={plan.kpis} />
                </div>

                {/* Quick Client Fulfillment Snapshot */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Client Fulfillment Overview
                      </h3>
                      <p className="text-xs text-slate-500">
                        Export orders sorted by demand and delivery status
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('clients')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      View all client filters & details →
                    </button>
                  </div>
                  <ClientTable
                    clients={plan.clients}
                    onSelectClient={handleSelectClient}
                  />
                </div>
              </TabsContent>

              {/* TAB 2: CLIENTS */}
              <TabsContent value="clients" className="space-y-4 mt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Client Fulfillment & Contract Allocations
                    </h3>
                    <p className="text-xs text-slate-500">
                      Click any client row to inspect individual orchard supplies, segment upgrades, and pricing.
                    </p>
                  </div>
                </div>

                <ClientTable
                  clients={plan.clients}
                  onSelectClient={handleSelectClient}
                />
              </TabsContent>

              {/* TAB 3: ALLOCATIONS */}
              <TabsContent value="allocations" className="space-y-4 mt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Detailed Orchard-to-Client Allocations
                    </h3>
                    <p className="text-xs text-slate-500">
                      Trace every exported tonne from farm origin and quality segment to destination customer.
                    </p>
                  </div>
                </div>

                <AllocationTable
                  allocations={plan.allocations}
                  clients={plan.clients}
                />
              </TabsContent>

              {/* TAB 4: FARM BALANCES */}
              <TabsContent value="farms" className="space-y-4 mt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Farm Harvest Balances & Local Market Flow
                    </h3>
                    <p className="text-xs text-slate-500">
                      View intake totals, exported volumes, and local market overflows by orchard and segment.
                    </p>
                  </div>
                </div>

                <FarmBalanceTable balances={plan.farmSegmentBalances} />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </main>

      {/* Client Details Sheet */}
      {plan && (
        <ClientDetailsSheet
          client={selectedClient}
          allocations={plan.allocations}
          open={Boolean(selectedClient)}
          onOpenChange={(open) => !open && setSelectedClient(null)}
        />
      )}

      {plan && (
        <AiAssistantSheet
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
          plan={plan}
        />
      )}
    </div>
  );
}
