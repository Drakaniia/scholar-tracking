/**
 * Client-side cache utility for API responses
 * Implements stale-while-revalidate pattern for optimal performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
  size: number;
}

interface CacheConfig {
  maxSize?: number;
  maxEntries?: number;
  defaultTTL?: number;
  staleTime?: number;
}

class ClientCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private defaultTTL: number = 3 * 60 * 1000; // 3 minutes default (reduced from 5)
  private staleTime: number = 15 * 1000; // 15 seconds stale time (reduced from 30)
  private maxSize: number = 10 * 1024 * 1024; // 10MB max cache size
  private maxEntries: number = 100; // Max 100 cache entries
  private currentSize: number = 0;

  constructor(config?: CacheConfig) {
    this.cache = new Map();
    if (config) {
      this.defaultTTL = config.defaultTTL || this.defaultTTL;
      this.staleTime = config.staleTime || this.staleTime;
      this.maxSize = config.maxSize || this.maxSize;
      this.maxEntries = config.maxEntries || this.maxEntries;
    }
    
    // Cleanup expired entries every minute
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.currentSize -= entry.size;
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict least recently used entries if cache is full
   */
  private evictIfNeeded(newEntrySize: number): void {
    // Check if we need to evict based on size
    while (this.currentSize + newEntrySize > this.maxSize && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.currentSize -= entry.size;
      }
      this.cache.delete(oldestKey);
    }

    // Check if we need to evict based on entry count
    while (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.currentSize -= entry.size;
      }
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    
    // If expired, remove from cache
    if (now > entry.expiresAt) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
      return null;
    }

    // Increment hit counter
    entry.hits++;

    return entry.data;
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
    const size = this.estimateSize(data);

    // Evict old entries if needed
    this.evictIfNeeded(size);

    // Remove old entry size if updating
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.currentSize -= oldEntry.size;
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      hits: 0,
      size,
    });

    this.currentSize += size;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
    }
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
    this.currentSize = 0;
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
  const cacheKey = generateCacheKey(url, options);

  // Try to get from cache
  const cached = clientCache.get<T>(cacheKey);
  
  if (cached) {
    // If stale, revalidate in background (non-blocking)
    if (clientCache.isStale(cacheKey)) {
      // Use queueMicrotask for better performance
      queueMicrotask(() => {
        fetch(url, options)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (data.success) {
              clientCache.set(cacheKey, data, ttl);
            }
          })
          .catch(err => console.warn('Background revalidation failed:', err));
      });
    }
    
    return cached;
  }

  // Fetch fresh data
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
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
    entries: clientCache.size(),
    sizeBytes: clientCache['currentSize'],
    sizeMB: (clientCache['currentSize'] / (1024 * 1024)).toFixed(2),
    clear: () => clientCache.clear(),
  };
}

/**
 * Optimized cache key generator
 */
export function generateCacheKey(url: string, options?: RequestInit): string {
  if (!options || Object.keys(options).length === 0) {
    return url;
  }
  
  // Only include relevant options in cache key
  const relevantOptions = {
    method: options.method,
    body: options.body,
  };
  
  return `${url}:${JSON.stringify(relevantOptions)}`;
}
