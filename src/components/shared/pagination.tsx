'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PageItem = number | '...';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const SIBLING_COUNT = 1;

export function getPaginationRange(
  currentPage: number,
  totalPages: number
): PageItem[] {
  // Clamp currentPage to valid range
  const page = Math.max(1, Math.min(currentPage, totalPages));

  if (totalPages <= 7) {
    return range(1, totalPages);
  }

  const leftSiblingIndex = Math.max(page - SIBLING_COUNT, 1);
  const rightSiblingIndex = Math.min(page + SIBLING_COUNT, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + 2 * SIBLING_COUNT;
    const leftRange = range(1, leftItemCount);
    return [...leftRange, '...', totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + 2 * SIBLING_COUNT;
    const rightRange = range(totalPages - rightItemCount + 1, totalPages);
    return [1, '...', ...rightRange];
  }

  const middleRange = range(leftSiblingIndex, rightSiblingIndex);
  return [1, '...', ...middleRange, '...', totalPages];
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPaginationRange(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between border-t pt-4 px-4 pb-4"
    >
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
        {totalCount !== undefined && (
          <> ({totalCount.toLocaleString()} total)</>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="hidden sm:flex items-center gap-1">
          {items.map((item, index) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
                >
                  ...
                </span>
              );
            }

            const isActive = item === currentPage;
            return (
              <Button
                key={item}
                variant={isActive ? 'default' : 'outline'}
                size="icon-sm"
                onClick={() => onPageChange(item)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Page ${item}`}
                className={cn(
                  isActive && 'pointer-events-none'
                )}
              >
                {item}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </nav>
  );
}
