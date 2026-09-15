import { LoadingDashboard } from './components/atlas/loading-dashboard';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50/80 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-64 bg-slate-200 animate-pulse rounded-md" />
        <LoadingDashboard />
      </div>
    </div>
  );
}
