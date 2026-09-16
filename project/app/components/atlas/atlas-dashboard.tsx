'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PlanResult, ClientResult } from '@/utils/types';
import { getPlan } from '@/lib/api/data';
import { uploadWorkbook } from '@/lib/api/upload';
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
import { AiAssistantSheet } from './ai-assistant-sheet';
import { StartScreen } from './start-screen';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { LayoutDashboard, Users, Wheat, Layers } from 'lucide-react';

interface AtlasDashboardProps {
  initialPlan?: PlanResult | null;
}

const CONTEXT_STORAGE_KEY = 'atlas-fresh:context-id';

export function AtlasDashboard({ initialPlan }: AtlasDashboardProps) {
  const [plan, setPlan] = useState<PlanResult | null>(initialPlan || null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>('Preloaded workbook');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(Boolean(initialPlan));

  // Panels state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [aiContextQuestion, setAiContextQuestion] = useState<string | null>(null);
  const [aiContextClientId, setAiContextClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch plan from Next.js API /api/data
  const loadPlan = useCallback(async (targetContextId?: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPlan(targetContextId ?? contextId);
      if (response.success && response.plan) {
        setPlan(response.plan);
        const resolvedContextId = response.contextId ?? targetContextId ?? null;
        setContextId(resolvedContextId);
        setSourceLabel(response.source?.label || (resolvedContextId ? 'Loaded workbook' : 'Preloaded workbook'));
        if (resolvedContextId) {
          window.localStorage.setItem(CONTEXT_STORAGE_KEY, resolvedContextId);
        }
      } else {
        throw new Error(response.error || 'Failed to load plan');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Unable to load today's plan.");
      setPlan(null);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, [contextId]);

  useEffect(() => {
    if (initialPlan) return;

    const savedContextId = window.localStorage.getItem(CONTEXT_STORAGE_KEY);
    if (savedContextId) {
      void loadPlan(savedContextId);
      return;
    }

    setIsReady(true);
  }, [initialPlan, loadPlan]);

  const handleContinueWithPreloadedData = useCallback(() => {
    void loadPlan(null);
  }, [loadPlan]);

  const handleUploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const response = await uploadWorkbook(file, (snapshot) => {
        setUploadProgress(snapshot.percentage);
      });

      if (!response.success || !response.plan) {
        throw new Error(response.error || 'The workbook could not be parsed.');
      }

      setPlan(response.plan);
      setContextId(response.contextId ?? null);
      setSourceLabel(response.source?.label || file.name);
      setActiveTab('overview');

      if (response.contextId) {
        window.localStorage.setItem(CONTEXT_STORAGE_KEY, response.contextId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'The workbook upload failed.');
      setPlan(null);
    } finally {
      setIsUploading(false);
      setIsReady(true);
    }
  }, []);

  const handleSelectClient = (client: ClientResult) => {
    setSelectedClient(client);
  };

  const handleAskAIAboutClient = (client: ClientResult) => {
    const reasonText = client.reason ? ` The shortage reason is ${client.reason}.` : '';
    setAiContextClientId(client.client_id);
    setAiContextQuestion(
      `Explain this client risk row for ${client.client_id} (${client.client_name}). The client is ${client.status} and the row is part of the Client Fulfillment Overview.${reasonText} Focus on demand_t, allocated_t, remaining_t, requested_segment, and acceptance_mode, and explain why this client is risk / partial / unserved if applicable.`
    );
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80 text-slate-900 font-sans">
      {/* Header Bar */}
      <DashboardHeader
        onChatClick={() => setIsChatOpen(true)}
        onRefresh={() => void loadPlan()}
        isLoading={isLoading || isUploading}
        hasPlan={Boolean(plan)}
        sourceLabel={sourceLabel}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {!isReady && !plan ? (
          <LoadingDashboard />
        ) : !plan ? (
          <div className="space-y-6">
            {isLoading ? (
              <LoadingDashboard />
            ) : (
              <StartScreen
                onContinue={handleContinueWithPreloadedData}
                onUploadFile={handleUploadFile}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                error={error}
              />
            )}
          </div>
        ) : (
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
        )}
      </main>

      {/* Client Details Sheet */}
      {plan && (
        <ClientDetailsSheet
          client={selectedClient}
          allocations={plan.allocations}
          open={Boolean(selectedClient)}
          onOpenChange={(open) => !open && setSelectedClient(null)}
          onAskAI={handleAskAIAboutClient}
        />
      )}

      {plan && (
        <AiAssistantSheet
          open={isChatOpen}
          onOpenChange={(open) => {
            setIsChatOpen(open);
            if (!open) {
              setAiContextQuestion(null);
              setAiContextClientId(null);
            }
          }}
          plan={plan}
          contextId={contextId}
          contextQuestion={aiContextQuestion}
          contextClientId={aiContextClientId}
        />
      )}
    </div>
  );
}
