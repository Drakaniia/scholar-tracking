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
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default
  private staleTime: number = 10 * 1000; // 10 seconds stale time (optimized)
  private maxSize: number = 10 * 1024 * 1024; // 10MB max cache size
  private maxEntries: number = 100; // Max 100 cache entries
  private currentSize: number = 0;
  private revalidationQueue: Set<string> = new Set();
  private revalidationInProgress: Map<string, Promise<unknown>> = new Map();

  constructor(config?: CacheConfig) {
    this.cache = new Map();
    if (config) {
      this.defaultTTL = config.defaultTTL || this.defaultTTL;
      this.staleTime = config.staleTime || this.staleTime;
      this.maxSize = config.maxSize || this.maxSize;
      this.maxEntries = config.maxEntries || this.maxEntries;
    }
    
    // Cleanup expired entries every 2 minutes (less frequent)
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 2 * 60 * 1000);
    }
  }

  /**
   * Estimate size of data in bytes (optimized)
   */
  private estimateSize(data: unknown): number {
    try {
      const str = JSON.stringify(data);
      // Use faster byte length calculation
      return str.length * 2; // Approximate 2 bytes per character
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
   * Evict least recently used entries if cache is full (optimized with LRU)
   */
  private evictIfNeeded(newEntrySize: number): void {
    // Check if we need to evict based on size
    if (this.currentSize + newEntrySize > this.maxSize) {
      // Sort by hits (LRU) and remove least used
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits);
      
      for (const [key, entry] of entries) {
        if (this.currentSize + newEntrySize <= this.maxSize) break;
        this.currentSize -= entry.size;
        this.cache.delete(key);
      }
    }

    // Check if we need to evict based on entry count
    if (this.cache.size >= this.maxEntries) {
      // Sort by hits and timestamp (LRU)
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => {
          if (a[1].hits !== b[1].hits) return a[1].hits - b[1].hits;
          return a[1].timestamp - b[1].timestamp;
        });
      
      const toRemove = this.cache.size - this.maxEntries + 1;
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        const [key, entry] = entries[i];
        this.currentSize -= entry.size;
        this.cache.delete(key);
      }
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
 * Fetch with cache - implements optimized stale-while-revalidate pattern
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
    // If stale, revalidate in background (non-blocking, deduplicated)
    if (clientCache.isStale(cacheKey)) {
      // Check if revalidation is already in progress
      const inProgress = clientCache['revalidationInProgress'].get(cacheKey);
      
      if (!inProgress && !clientCache['revalidationQueue'].has(cacheKey)) {
        clientCache['revalidationQueue'].add(cacheKey);
        
        // Use requestIdleCallback for better performance (fallback to setTimeout)
        const scheduleRevalidation = typeof requestIdleCallback !== 'undefined' 
          ? requestIdleCallback 
          : (cb: () => void) => setTimeout(cb, 0);
        
        scheduleRevalidation(() => {
          const revalidationPromise = fetch(url, options)
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then(data => {
              if (data.success) {
                clientCache.set(cacheKey, data, ttl);
              }
            })
            .catch(err => console.warn('Background revalidation failed:', err))
            .finally(() => {
              clientCache['revalidationQueue'].delete(cacheKey);
              clientCache['revalidationInProgress'].delete(cacheKey);
            });
          
          clientCache['revalidationInProgress'].set(cacheKey, revalidationPromise);
        });
      }
    }
    
    return cached;
  }

  // Check if fetch is already in progress
  const inProgress = clientCache['revalidationInProgress'].get(cacheKey);
  if (inProgress) {
    return inProgress as Promise<T>;
  }

  // Fetch fresh data
  const fetchPromise = fetch(url, options)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        clientCache.set(cacheKey, data, ttl);
      }
      return data;
    })
    .finally(() => {
      clientCache['revalidationInProgress'].delete(cacheKey);
    });

  clientCache['revalidationInProgress'].set(cacheKey, fetchPromise);
  return fetchPromise;
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
