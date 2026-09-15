'use client';

import React, { useState, useMemo } from 'react';
import { FarmSegmentBalance } from '@/utils/types';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { Pagination } from './pagination';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent } from '../ui/sheet';
import { formatTonnes, formatCurrency } from '@/lib/formatters';
import { Search, X, ChevronRight, Store, Truck, Wheat } from 'lucide-react';

interface FarmBalanceTableProps {
  balances: FarmSegmentBalance[];
}

export function FarmBalanceTable({ balances }: FarmBalanceTableProps) {
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);

  // Filtered rows
  const filteredBalances = useMemo(() => {
    return balances.filter((row) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        if (!row.farm_id.toLowerCase().includes(q)) return false;
      }
      if (selectedSegment !== 'ALL' && row.segment !== selectedSegment) {
        return false;
      }
      return true;
    });
  }, [balances, search, selectedSegment]);

  // Pagination
  const totalPages = Math.ceil(filteredBalances.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBalances.slice(start, start + pageSize);
  }, [filteredBalances, currentPage, pageSize]);

  // Farm detail data
  const farmDetailBalances = useMemo(() => {
    if (!selectedFarmId) return [];
    return balances.filter((b) => b.farm_id === selectedFarmId);
  }, [balances, selectedFarmId]);

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by farm ID (e.g. F01, F15)..."
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

        <div className="flex items-center gap-2">
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

          {(search !== '' || selectedSegment !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedSegment('ALL');
                setCurrentPage(1);
              }}
              className="h-9 text-xs text-slate-600"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Farm Balances Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table id="farm-balances-table" className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Farm ID</th>
                <th className="py-3 px-4">Segment</th>
                <th className="py-3 px-4 text-right">Actual Received</th>
                <th className="py-3 px-4 text-right">Exported</th>
                <th className="py-3 px-4 text-right">Local Market</th>
                <th className="py-3 px-4 text-right">Local Value</th>
                <th className="py-3 px-3 text-center sr-only">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-700">No farm balances found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No records match the current search filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const hasLocal = row.local_t > 0;
                  return (
                    <tr
                      key={`${row.farm_id}-${row.segment}-${idx}`}
                      onClick={() => setSelectedFarmId(row.farm_id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedFarmId(row.farm_id);
                        }
                      }}
                      aria-label={`View full farm breakdown for ${row.farm_id}`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
                        Farm {row.farm_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-800">
                          {row.segment}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                        {formatTonnes(row.actual_t)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        {formatTonnes(row.exported_t)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {hasLocal ? (
                          <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {formatTonnes(row.local_t)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0 t</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {hasLocal ? (
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(row.local_value_eur)}
                          </span>
                        ) : (
                          <span className="text-slate-400">€0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 group-hover:text-slate-700">
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
            totalItems={filteredBalances.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Farm Detail Sheet */}
      <Sheet open={Boolean(selectedFarmId)} onOpenChange={(open) => !open && setSelectedFarmId(null)}>
        <SheetHeader onClose={() => setSelectedFarmId(null)}>
          <div className="flex items-center gap-2">
            <SheetTitle>Farm {selectedFarmId} Balance Profile</SheetTitle>
          </div>
          <SheetDescription>
            Complete segment intake, export clearance, and local market disposition
          </SheetDescription>
        </SheetHeader>

        <SheetContent className="space-y-5">
          {selectedFarmId && (
            <>
              {/* Farm summary statistics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block">Total Received</span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {formatTonnes(farmDetailBalances.reduce((acc, b) => acc + b.actual_t, 0))}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                  <span className="text-emerald-800 block">Exported Volume</span>
                  <span className="text-lg font-bold font-mono text-emerald-950">
                    {formatTonnes(farmDetailBalances.reduce((acc, b) => acc + b.exported_t, 0))}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60">
                  <span className="text-amber-800 block">Local Volume</span>
                  <span className="text-lg font-bold font-mono text-amber-950">
                    {formatTonnes(farmDetailBalances.reduce((acc, b) => acc + b.local_t, 0))}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 block">Local Value</span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {formatCurrency(farmDetailBalances.reduce((acc, b) => acc + b.local_value_eur, 0))}
                  </span>
                </div>
              </div>

              {/* Segment rows */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Breakdown by Harvest Quality Segment
                </h4>
                <div className="space-y-2">
                  {farmDetailBalances.map((b) => (
                    <div
                      key={b.segment}
                      className="p-3 rounded-lg border border-slate-200 bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-bold font-mono text-slate-900">
                          <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs">
                            {b.segment}
                          </span>
                          Segment {b.segment}
                        </span>
                        <span className="font-mono text-slate-700 font-semibold">
                          {formatTonnes(b.actual_t)} intake
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Export</span>
                          <span className="font-mono font-medium text-emerald-700">
                            {formatTonnes(b.exported_t)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Local</span>
                          <span className={`font-mono font-medium ${b.local_t > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {formatTonnes(b.local_t)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Local Value</span>
                          <span className="font-mono font-medium text-slate-700">
                            {formatCurrency(b.local_value_eur)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
