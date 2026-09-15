'use client';

import React, { useState, useMemo } from 'react';
import { AllocationRow, ClientResult } from '@/utils/types'
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { Pagination } from './pagination';
import { formatTonnes, formatCurrency, formatQualityUpgrade } from '@/lib/formatters';
import { Search, X, Filter } from 'lucide-react';

interface AllocationTableProps {
  allocations: AllocationRow[];
  clients?: ClientResult[];
}

export function AllocationTable({ allocations, clients = [] }: AllocationTableProps) {
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('ALL');
  const [selectedFarm, setSelectedFarm] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Map client ID to client name for richer display
  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.client_id, c.client_name));
    return map;
  }, [clients]);

  // Distinct farms for filter dropdown
  const uniqueFarms = useMemo(() => {
    const farms = Array.from(new Set(allocations.map((a) => a.farm_id)));
    return farms.sort();
  }, [allocations]);

  // Filtered rows
  const filteredAllocations = useMemo(() => {
    return allocations.filter((row) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const clientName = clientNameMap.get(row.client_id)?.toLowerCase() || '';
        const matchClient = row.client_id.toLowerCase().includes(q) || clientName.includes(q);
        const matchFarm = row.farm_id.toLowerCase().includes(q);
        if (!matchClient && !matchFarm) return false;
      }

      if (selectedSegment !== 'ALL' && row.segment !== selectedSegment) {
        return false;
      }

      if (selectedFarm !== 'ALL' && row.farm_id !== selectedFarm) {
        return false;
      }

      return true;
    });
  }, [allocations, search, selectedSegment, selectedFarm, clientNameMap]);

  // Pagination
  const totalPages = Math.ceil(filteredAllocations.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAllocations.slice(start, start + pageSize);
  }, [filteredAllocations, currentPage, pageSize]);

  const resetFilters = () => {
    setSearch('');
    setSelectedSegment('ALL');
    setSelectedFarm('ALL');
    setCurrentPage(1);
  };

  const isFiltered = search !== '' || selectedSegment !== 'ALL' || selectedFarm !== 'ALL';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by farm (e.g. F01) or client (e.g. C01, Aster)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 bg-white"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segment Filter */}
          <Select
            value={selectedSegment}
            onChange={(e) => {
              setSelectedSegment(e.target.value);
              setCurrentPage(1);
            }}
            className="w-36 text-xs"
            aria-label="Filter by segment"
          >
            <option value="ALL">All Segments</option>
            <option value="A">Segment A</option>
            <option value="B">Segment B</option>
            <option value="C">Segment C</option>
            <option value="D">Segment D</option>
          </Select>

          {/* Farm Filter */}
          <Select
            value={selectedFarm}
            onChange={(e) => {
              setSelectedFarm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-32 text-xs"
            aria-label="Filter by farm"
          >
            <option value="ALL">All Farms</option>
            {uniqueFarms.map((farm) => (
              <option key={farm} value={farm}>
                Farm {farm}
              </option>
            ))}
          </Select>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 text-xs text-slate-600"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Allocations Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table id="allocations-table" className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Farm ID</th>
                <th className="py-3 px-4">Segment</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">Allocated Tonnes</th>
                <th className="py-3 px-4">Quality Upgrade</th>
                <th className="py-3 px-4 text-right">Export Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-700">No allocation records found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No orchard supplies match your current filter parameters.
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
                paginatedRows.map((row, idx) => {
                  const clientName = clientNameMap.get(row.client_id);
                  return (
                    <tr key={`${row.farm_id}-${row.client_id}-${row.segment}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {row.farm_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-800">
                          {row.segment}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {clientName || row.client_id}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {row.client_id}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        {formatTonnes(row.tonnes)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            row.quality_upgrade > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          {formatQualityUpgrade(row.quality_upgrade)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(row.export_revenue_eur)}
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
            totalItems={filteredAllocations.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
