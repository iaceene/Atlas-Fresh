import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'Atlas Fresh — Daily Apple Export Planner',
  description: 'Operations planning dashboard for daily apple export allocations, quality distribution, farm balances, client fulfillment, and AI planning assistant.',
  openGraph: {
    title: 'Atlas Fresh — Daily Apple Export Planner',
    description: 'Operations planning dashboard for daily apple export allocations, quality distribution, farm balances, client fulfillment, and AI planning assistant.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
