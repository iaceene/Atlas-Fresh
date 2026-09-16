'use client';

import React, { useState, useMemo } from 'react';
import { ClientResult } from '@/utils/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ClientFilters, ClientFiltersState } from './client-filters';
import { Pagination } from './pagination';
import { formatTonnes, formatCurrency } from '@/lib/formatters';
import { CheckCircle2, Clock, CircleX, ChevronRight } from 'lucide-react';

interface ClientTableProps {
  clients: ClientResult[];
  onSelectClient: (client: ClientResult) => void;
}

export function ClientTable({ clients, onSelectClient }: ClientTableProps) {
  const [filters, setFilters] = useState<ClientFiltersState>({
    search: '',
    status: 'ALL',
    segment: 'ALL',
    acceptance: 'ALL',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'ALL',
      segment: 'ALL',
      acceptance: 'ALL',
    });
    setCurrentPage(1);
  };

  // Filter logic
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchName = client.client_name.toLowerCase().includes(query);
        const matchId = client.client_id.toLowerCase().includes(query);
        if (!matchName && !matchId) return false;
      }

      // Status
      if (filters.status !== 'ALL' && client.status !== filters.status) {
        return false;
      }

      // Segment
      if (filters.segment !== 'ALL' && client.requested_segment !== filters.segment) {
        return false;
      }

      // Acceptance
      if (filters.acceptance !== 'ALL' && client.acceptance_mode !== filters.acceptance) {
        return false;
      }

      return true;
    });
  }, [clients, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  const handleFilterChange = (newFilters: ClientFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <ClientFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={resetFilters}
        totalClients={clients.length}
        filteredClients={filteredClients.length}
      />

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table id="client-fulfillment-table" className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-3">Segment</th>
                <th className="py-3 px-3">Acceptance</th>
                <th className="py-3 px-3 text-right">Demand</th>
                <th className="py-3 px-3 text-right">Allocated</th>
                <th className="py-3 px-3 text-right">Remaining</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-2 text-center sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-700">No clients match your filters.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search criteria or resetting filters.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="mt-3 text-xs"
                    >
                      Clear filters
                    </Button>
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => {
                  const isPartial = client.status === 'PARTIAL';
                  const isUnserved = client.status === 'UNSERVED';
                  const isComplete = client.status === 'COMPLETE';

                  return (
                    <tr
                      key={client.client_id}
                      onClick={() => onSelectClient(client)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectClient(client);
                        }
                      }}
                      aria-label={`View details for ${client.client_name}`}
                    >
                      {/* Client Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
                            {client.client_name}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {client.client_id}
                          </span>
                        </div>
                      </td>

                      {/* Segment */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-800">
                          {client.requested_segment}
                        </span>
                      </td>

                      {/* Acceptance */}
                      <td className="py-3 px-3">
                        <span className="text-xs font-mono text-slate-600">
                          {client.acceptance_mode}
                        </span>
                      </td>

                      {/* Demand */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                        {formatTonnes(client.demand_t)}
                      </td>

                      {/* Allocated */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                        {formatTonnes(client.allocated_t)}
                      </td>

                      {/* Remaining */}
                      <td className="py-3 px-3 text-right font-mono">
                        {client.remaining_t > 0 ? (
                          <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {formatTonnes(client.remaining_t)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0 t</span>
                        )}
                      </td>

                      {/* Status + Shortage note */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant={
                              isComplete ? 'positive' : isPartial ? 'warning' : 'destructive'
                            }
                            className="text-xs py-0.5"
                          >
                            {isComplete && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {isPartial && <Clock className="h-3 w-3 mr-1" />}
                            {isUnserved && <CircleX className="h-3 w-3 mr-1" />}
                            {client.status}
                          </Badge>
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(client.revenue_eur)}
                      </td>

                      {/* Chevron Action indicator */}
                      <td className="py-3 px-2 text-center text-slate-400 group-hover:text-slate-700">
                        <ChevronRight className="h-4 w-4 inline-block" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredClients.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    </div>
  );
}
