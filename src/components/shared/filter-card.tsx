'use client';

import type { ReactNode } from 'react';

import { Filter, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type ActiveFilter = {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
};

type FilterCardProps = {
  title: string;
  resultLabel: string;
  activeFilters: ActiveFilter[];
  onClear: () => void;
  children: ReactNode;
  className?: string;
  childrenClassName?: string;
};

type FilterFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

type FilterSearchFieldProps = React.ComponentProps<typeof Input> & {
  label?: string;
  containerClassName?: string;
};

export function FilterCard({
  title,
  resultLabel,
  activeFilters,
  onClear,
  children,
  className,
  childrenClassName,
}: FilterCardProps) {
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <Card
      className={cn('mb-4 overflow-hidden border-slate-200 bg-white py-0 shadow-sm', className)}
    >
      <CardContent className="p-0">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-xs">
                <Filter className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-950">{title}</h2>
                <p className="text-xs text-slate-500">{resultLabel}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium',
                  hasActiveFilters
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-500'
                )}
              >
                {hasActiveFilters ? `${activeFilters.length} active` : 'No active filters'}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClear}
                disabled={!hasActiveFilters}
                className="h-8 bg-white px-2.5 text-xs"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className={cn('grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4', childrenClassName)}>
          {children}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-4 py-3">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.onRemove}
                className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-white focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                aria-label={`Remove ${filter.label} filter`}
              >
                <span className="shrink-0 font-medium text-slate-500">{filter.label}</span>
                <span className="max-w-[16rem] truncate text-slate-950">{filter.value}</span>
                <X className="h-3 w-3 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

export function FilterSearchField({
  label = 'Search',
  containerClassName,
  className,
  ...props
}: FilterSearchFieldProps) {
  return (
    <FilterField label={label} className={containerClassName}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className={cn('h-10 bg-white pl-10 text-sm', className)} {...props} />
      </div>
    </FilterField>
  );
}
