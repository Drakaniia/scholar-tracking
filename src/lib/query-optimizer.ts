/**
 * Database query optimization utilities
 * Provides helpers for efficient database queries
 */

import prisma from './prisma';

/**
 * Batch multiple queries together for better performance
 */
export async function batchQueries<T extends Record<string, () => Promise<unknown>>>(
  queries: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const entries = Object.entries(queries);
  const results = await Promise.all(entries.map(([, query]) => query()));
  
  return Object.fromEntries(
    entries.map(([key], index) => [key, results[index]])
  ) as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

/**
 * Optimized count query with caching
 */
export async function cachedCount(
  model: string,
  where?: Record<string, unknown>
): Promise<number> {
  const cacheKey = `count:${model}:${JSON.stringify(where || {})}`;
  
  // Check if we have a recent count (within 30 seconds)
  const cached = globalThis.__queryCache?.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.value as number;
  }

  // Perform count - using type assertion for dynamic model access
  const modelAccess = prisma as unknown as Record<string, { count: (args?: { where?: Record<string, unknown> }) => Promise<number> }>;
  const count = await modelAccess[model].count({ where });

  // Cache the result
  if (!globalThis.__queryCache) {
    globalThis.__queryCache = new Map();
  }
  globalThis.__queryCache.set(cacheKey, { value: count, timestamp: Date.now() });

  return count;
}

/**
 * Optimized pagination helper
 */
export function getPaginationParams(page: number, limit: number) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

/**
 * Build optimized where clause for search
 */
export function buildSearchWhere(
  search: string,
  fields: string[],
  additionalFilters?: Record<string, unknown>
) {
  const searchCondition = search
    ? {
        OR: fields.map(field => ({
          [field]: { contains: search, mode: 'insensitive' as const },
        })),
      }
    : {};

  return {
    AND: [searchCondition, additionalFilters || {}].filter(
      obj => Object.keys(obj).length > 0
    ),
  };
}

/**
 * Parallel query execution with error handling
 */
export async function parallelQueries<T>(
  queries: (() => Promise<T>)[]
): Promise<T[]> {
  const results = await Promise.allSettled(queries.map(q => q()));
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    console.error(`Query ${index} failed:`, result.reason);
    throw result.reason;
  });
}

/**
 * Cleanup old cache entries
 */
export function cleanupQueryCache() {
  if (!globalThis.__queryCache) return;
  
  const now = Date.now();
  for (const [key, value] of globalThis.__queryCache.entries()) {
    if (now - value.timestamp > 60000) { // 1 minute
      globalThis.__queryCache.delete(key);
    }
  }
}

// Cleanup cache every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupQueryCache, 60000);
}

// Type augmentation for global cache
declare global {
  var __queryCache: Map<string, { value: unknown; timestamp: number }> | undefined;
}
