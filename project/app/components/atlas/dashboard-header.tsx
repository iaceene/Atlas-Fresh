'use client';

import React from 'react';
import { Button } from '../ui/button';
import { MessageCircle, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  onChatClick: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  hasPlan?: boolean;
}

export function DashboardHeader({
  onChatClick,
  onRefresh,
  isLoading,
  hasPlan,
}: DashboardHeaderProps) {
  return (
    <header
      id="dashboard-header"
      className="border-b border-slate-200 bg-white/90 backdrop-blur-xs sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 transition-all"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        {/* Left: Brand and Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white font-bold text-base shadow-xs">
            AF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Atlas Fresh
              </h1>
              <span className="hidden sm:inline-block text-slate-300">|</span>
              <span className="text-xs sm:text-sm font-medium text-slate-600">
                Daily Export Planner
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              Daily orchard intake allocation, export contract fulfillment & station capacity control
            </p>
          </div>
        </div>

        {/* Right: Actions and Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Assistant Button */}
          <Button
            id="open-ai-chat-btn"
            variant="outline"
            size="sm"
            onClick={onChatClick}
            disabled={isLoading || !hasPlan}
            className="h-9 px-3 text-slate-700"
            title="Open Atlas assistant"
            aria-label="Open Atlas assistant"
          >
            <MessageCircle className="h-4 w-4 sm:mr-1.5 text-emerald-700" />
            <span className="hidden sm:inline">Assistant</span>
          </Button>

          {/* Refresh Button */}
          <Button
            id="refresh-plan-btn"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-3 text-slate-700"
            title="Refresh current plan from backend"
            aria-label="Refresh current plan"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-1.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

        </div>
      </div>
    </header>
  );
}
