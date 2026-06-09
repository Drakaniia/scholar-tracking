'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function DashboardErrorState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <RefreshCw className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-950">Dashboard data did not load</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Refresh the page to request the latest scholarship summary again.
        </p>
        <Button onClick={() => window.location.reload()} className="mt-5 rounded-lg">
          Reload Dashboard
        </Button>
      </div>
    </div>
  );
}
