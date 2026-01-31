/**
 * Query Optimizer for Database Operations
 * Implements query result caching and optimization strategies
 */

interface QueryCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class QueryOptimizer {
  private queryCache: Map<string, QueryCacheEntry<unknown>>;
  private defaultTTL: number = 3 * 60 * 1000; // 3 minutes for server-side cache (increased)
  private maxEntries: number = 100; // Increased from 50

  constructor() {
    this.queryCache = new Map();
    
    // Cleanup expired entries every 3 minutes
    setInterval(() => this.cleanup(), 3 * 60 * 1000);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.queryCache.entries()) {
      if (now > entry.expiresAt) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Get cached query result
   */
  get<T>(key: string): T | null {
    const entry = this.queryCache.get(key) as QueryCacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    
    // If expired, remove from cache
    if (now > entry.expiresAt) {
      this.queryCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set query result in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Evict oldest entry if cache is full
    if (this.queryCache.size >= this.maxEntries) {
      const oldestKey = this.queryCache.keys().next().value as string | undefined;
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }

    this.queryCache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.queryCache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.queryCache.keys()) {
      if (regex.test(key)) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.queryCache.clear();
  }

  /**
   * Execute query with caching
   */
  async executeWithCache<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute query
    const result = await queryFn();

    // Cache result
    this.set(key, result, ttl);

    return result;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      entries: this.queryCache.size,
      maxEntries: this.maxEntries,
      clear: () => this.clear(),
    };
  }
}

// Singleton instance
export const queryOptimizer = new QueryOptimizer();

/**
 * Generate cache key for queries
 */
export function generateQueryKey(
  operation: string,
  params?: Record<string, unknown>
): string {
  if (!params || Object.keys(params).length === 0) {
    return operation;
  }
  
  // Sort keys for consistent cache keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, unknown>);
  
  return `${operation}:${JSON.stringify(sortedParams)}`;
}

/**
 * Batch query executor - executes multiple queries in parallel
 */
export async function executeBatchQueries<T>(
  queries: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(queries.map(query => query()));
}

/**
 * Batch queries with object keys - executes multiple queries in parallel
 * Returns an object with the same keys as input
 */
export async function batchQueries<T extends Record<string, () => Promise<unknown>>>(
  queries: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const keys = Object.keys(queries) as Array<keyof T>;
  const promises = keys.map(key => queries[key]());
  const results = await Promise.all(promises);
  
  return keys.reduce((acc, key, index) => {
    acc[key] = results[index] as Awaited<ReturnType<T[typeof key]>>;
    return acc;
  }, {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> });
}

/**
 * Optimized select fields helper
 */
export function selectFields<T extends Record<string, boolean>>(
  fields: T
): T {
  return fields;
}

/**
 * Get pagination parameters from page and limit
 */
export function getPaginationParams(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const take = limit;
  
  return { page, limit, skip, take };
}

/**
 * Build search where clause for Prisma queries
 */
export function buildSearchWhere(
  searchTerm: string,
  searchFields: string[],
  additionalFilters?: Record<string, unknown>
): Record<string, unknown> {
  const searchCondition = searchTerm ? {
    OR: searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    })),
  } : {};
  
  if (!additionalFilters) {
    return searchCondition;
  }
  
  // Merge search condition with additional filters
  if (Object.keys(searchCondition).length === 0) {
    return additionalFilters;
  }
  
  return {
    AND: [searchCondition, additionalFilters],
  };
}
