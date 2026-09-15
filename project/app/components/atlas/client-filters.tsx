'use client';

import React from 'react';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';
import { Search, X, ListFilter } from 'lucide-react';

export interface ClientFiltersState {
  search: string;
  status: string; // 'ALL' | 'COMPLETE' | 'PARTIAL' | 'UNSERVED'
  segment: string; // 'ALL' | 'A' | 'B' | 'C' | 'D'
  acceptance: string; // 'ALL' | 'EXACT' | 'MINIMUM'
}

interface ClientFiltersProps {
  filters: ClientFiltersState;
  onChange: (filters: ClientFiltersState) => void;
  onReset: () => void;
  totalClients: number;
  filteredClients: number;
}

export function ClientFilters({
  filters,
  onChange,
  onReset,
  totalClients,
  filteredClients,
}: ClientFiltersProps) {
  const isFiltered =
    filters.search !== '' ||
    filters.status !== 'ALL' ||
    filters.segment !== 'ALL' ||
    filters.acceptance !== 'ALL';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            id="client-search-input"
            type="text"
            placeholder="Search clients by name or ID (e.g. Boreal, C02)..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9 bg-white"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Showing <strong className="text-slate-900">{filteredClients}</strong> of {totalClients}
          </span>
          {isFiltered && (
            <Button
              id="clear-client-filters-btn"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs text-slate-600 hover:text-slate-900"
            >
              <X className="h-3 w-3 mr-1" />
              Reset filters
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Status Filter */}
        <div>
          <label htmlFor="filter-client-status" className="block text-xs font-medium text-slate-600 mb-1">
            Fulfillment Status
          </label>
          <Select
            id="filter-client-status"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETE">Complete (Fulfilled)</option>
            <option value="PARTIAL">Partial (Shortage)</option>
            <option value="UNSERVED">Unserved</option>
          </Select>
        </div>

        {/* Segment Filter */}
        <div>
          <label htmlFor="filter-client-segment" className="block text-xs font-medium text-slate-600 mb-1">
            Requested Segment
          </label>
          <Select
            id="filter-client-segment"
            value={filters.segment}
            onChange={(e) => onChange({ ...filters, segment: e.target.value })}
            className="text-xs"
          >
            <option value="ALL">All Segments</option>
            <option value="A">Segment A (Premium)</option>
            <option value="B">Segment B (Standard)</option>
            <option value="C">Segment C (Commercial)</option>
            <option value="D">Segment D (Economy)</option>
          </Select>
        </div>

        {/* Acceptance Filter */}
        <div>
          <label htmlFor="filter-client-acceptance" className="block text-xs font-medium text-slate-600 mb-1">
            Acceptance Mode
          </label>
          <Select
            id="filter-client-acceptance"
            value={filters.acceptance}
            onChange={(e) => onChange({ ...filters, acceptance: e.target.value })}
            className="text-xs"
          >
            <option value="ALL">All Modes</option>
            <option value="EXACT">Exact (Must receive requested grade)</option>
            <option value="MINIMUM">Minimum (Accepts upgrades)</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
