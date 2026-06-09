'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const HEADER_BACKGROUND_IMAGE_URL = '/images/background2.jpg';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <section
      className={cn(
        'relative isolate mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 overflow-hidden"
      >
        <div
          className="absolute inset-0 -scale-x-100 bg-cover bg-center bg-no-repeat opacity-55 saturate-[0.95]"
          style={{ backgroundImage: `url(${HEADER_BACKGROUND_IMAGE_URL})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/20 to-white" />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500 via-teal-500 to-sky-500"
      />

      <div
        className={cn(
          'relative z-10 flex min-h-[104px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6'
        )}
      >
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.7rem]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-md bg-white/75 p-1 shadow-sm ring-1 ring-slate-200/70 backdrop-blur sm:justify-end">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
