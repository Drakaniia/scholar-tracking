/**
 * Client-side cache utility for API responses
 * Implements stale-while-revalidate pattern for optimal performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ClientCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default
  private staleTime: number = 30 * 1000; // 30 seconds stale time

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // If expired, remove from cache
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if cached data is stale (needs revalidation)
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;

    const now = Date.now();
    return now - entry.timestamp > this.staleTime;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const clientCache = new ClientCache();

/**
 * Fetch with cache - implements stale-while-revalidate pattern
 */
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  ttl?: number
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options || {})}`;

  // Try to get from cache
  const cached = clientCache.get<T>(cacheKey);
  
  if (cached) {
    // If stale, revalidate in background
    if (clientCache.isStale(cacheKey)) {
      fetch(url, options)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            clientCache.set(cacheKey, data, ttl);
          }
        })
        .catch(err => console.error('Background revalidation failed:', err));
    }
    
    return cached;
  }

  // Fetch fresh data
  const response = await fetch(url, options);
  const data = await response.json();

  if (data.success) {
    clientCache.set(cacheKey, data, ttl);
  }

  return data;
}

/**
 * Mutate cache and optionally revalidate
 */
export async function mutateCache(
  key: string,
  updater?: (current: unknown) => unknown,
  revalidate: boolean = true
): Promise<void> {
  if (updater) {
    const current = clientCache.get(key);
    if (current) {
      const updated = updater(current);
      clientCache.set(key, updated);
    }
  } else {
    clientCache.invalidate(key);
  }

  if (revalidate) {
    // Trigger revalidation
    const [url] = key.split(':');
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        clientCache.set(key, data);
      }
    } catch (err) {
      console.error('Revalidation failed:', err);
    }
  }
}

/**
 * Prefetch multiple endpoints in the background
 * Useful for preloading data when user lands on dashboard
 */
export async function prefetchEndpoints(endpoints: string[]): Promise<void> {
  const promises = endpoints.map(endpoint => 
    fetchWithCache(endpoint, undefined, 5 * 60 * 1000).catch(err => {
      console.warn(`Failed to prefetch ${endpoint}:`, err);
    })
  );
  
  await Promise.allSettled(promises);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: clientCache.size(),
    clear: () => clientCache.clear(),
  };
}
