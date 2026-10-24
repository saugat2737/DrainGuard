/**
 * High-Performance Bounded In-Memory Cache with LRU Eviction & Request Deduplication
 * 
 * Complies with strict Zero-Paid-API and Production Hardening requirements:
 * - Single-process bounded memory storage with zero external subscription dependencies.
 * - Least Recently Used (LRU) eviction when entry count exceeds `maxSize`.
 * - Per-key in-flight request coalescing (prevents the "Thundering Herd" problem).
 * - Safe schema and freshness metadata preservation.
 * - Stale-if-error support for read-only upstream data.
 * - Telemetry metrics tracking hits, misses, refreshes, evictions, and errors.
 */

export interface CacheEntry<T> {
  value: T;
  cachedAt: number; // epoch ms
  expiresAt: number; // epoch ms
  staleUntil: number; // epoch ms for stale-if-error window
  source: string;
  isStale?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  refreshes: number;
  evictions: number;
  inFlightDeduplications: number;
  errors: number;
}

export interface CachePolicy {
  defaultTtlMs: number;
  staleGraceMs: number; // How long stale data can be served if upstream fails
  maxSize: number;
}

// Configured policy targets per data category
export const CACHE_POLICIES = {
  // Photon geocoding search results: 10 mins TTL, 2 hours stale-if-error
  photonSearch: {
    defaultTtlMs: 10 * 60 * 1000,
    staleGraceMs: 2 * 60 * 60 * 1000,
    maxSize: 300,
  },
  // Reverse geocoding: up to 24 hours TTL, stable geographic labels
  photonReverse: {
    defaultTtlMs: 24 * 60 * 60 * 1000,
    staleGraceMs: 48 * 60 * 60 * 1000,
    maxSize: 500,
  },
  // Open-Meteo current & hourly forecast: 12 mins TTL
  weatherForecast: {
    defaultTtlMs: 12 * 60 * 1000,
    staleGraceMs: 60 * 60 * 1000,
    maxSize: 50,
  },
  // Historical / antecedent rain archive: 12 hours TTL
  antecedentRain: {
    defaultTtlMs: 12 * 60 * 60 * 1000,
    staleGraceMs: 24 * 60 * 60 * 1000,
    maxSize: 50,
  },
  // OSRM baseline routing geometry: 8 mins TTL
  osrmRoute: {
    defaultTtlMs: 8 * 60 * 1000,
    staleGraceMs: 30 * 60 * 1000,
    maxSize: 150,
  },
  // Service status summary: 60s TTL (prevents health check fan-out)
  serviceStatus: {
    defaultTtlMs: 60 * 1000,
    staleGraceMs: 5 * 60 * 1000,
    maxSize: 20,
  },
} as const;

export class AppCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private inFlight = new Map<string, Promise<T>>();
  private policy: CachePolicy;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    refreshes: 0,
    evictions: 0,
    inFlightDeduplications: 0,
    errors: 0,
  };

  constructor(policy: CachePolicy) {
    this.policy = policy;
  }

  /**
   * Retrieve item from cache if fresh or still within valid window
   */
  get(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    const now = Date.now();
    if (now <= entry.expiresAt) {
      this.metrics.hits++;
      // LRU refresh position: delete & re-insert
      this.store.delete(key);
      this.store.set(key, entry);
      return { ...entry, isStale: false };
    }

    // Check if within stale grace period
    if (now <= entry.staleUntil) {
      return { ...entry, isStale: true };
    }

    // Expired completely
    this.store.delete(key);
    this.metrics.misses++;
    return null;
  }

  /**
   * Set item into cache with LRU eviction when exceeding maxSize
   */
  set(key: string, value: T, source: string, ttlMs?: number): CacheEntry<T> {
    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.policy.defaultTtlMs;
    const entry: CacheEntry<T> = {
      value,
      cachedAt: now,
      expiresAt: now + effectiveTtl,
      staleUntil: now + effectiveTtl + this.policy.staleGraceMs,
      source,
      isStale: false,
    };

    if (this.store.has(key)) {
      this.store.delete(key);
      this.metrics.refreshes++;
    } else {
      this.metrics.sets++;
      // Enforce bounded memory size
      if (this.store.size >= this.policy.maxSize) {
        // Map keys() in insertion order -> first key is least recently used
        const oldestKey = this.store.keys().next().value;
        if (oldestKey !== undefined) {
          this.store.delete(oldestKey);
          this.metrics.evictions++;
        }
      }
    }

    this.store.set(key, entry);
    return entry;
  }

  /**
   * High-performance request coalescing:
   * If a fetch is already in flight for `key`, returns the existing promise.
   * If fresh data is in cache, returns it immediately.
   * If upstream loader fails, returns stale cached data if within stale window.
   */
  async getOrLoad(
    key: string,
    loader: () => Promise<{ value: T; source: string; ttlMs?: number }>,
    allowStaleOnError = true
  ): Promise<{ data: T; source: string; cached: boolean; isStale: boolean }> {
    // 1. Check fresh cache
    const existing = this.get(key);
    if (existing && !existing.isStale) {
      return {
        data: existing.value,
        source: existing.source,
        cached: true,
        isStale: false,
      };
    }

    // 2. Check in-flight deduplication
    const activePromise = this.inFlight.get(key);
    if (activePromise) {
      this.metrics.inFlightDeduplications++;
      const data = await activePromise;
      return { data, source: "coalesced_inflight", cached: true, isStale: false };
    }

    // 3. Initiate upstream request with in-flight tracking
    const task = (async () => {
      try {
        const result = await loader();
        this.set(key, result.value, result.source, result.ttlMs);
        return result.value;
      } catch (err) {
        this.metrics.errors++;
        // Stale-if-error fallback
        if (allowStaleOnError && existing) {
          return existing.value;
        }
        throw err;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, task);

    try {
      const data = await task;
      // If we fell back to stale on error:
      const current = this.store.get(key);
      const isStale = current ? Date.now() > current.expiresAt : false;
      return {
        data,
        source: current?.source || "upstream",
        cached: isStale,
        isStale,
      };
    } catch (err) {
      throw err;
    }
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  size(): number {
    return this.store.size;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }
}
