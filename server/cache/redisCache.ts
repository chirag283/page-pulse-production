import Redis from 'ioredis';
import { logger } from '../utils/logger';

interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  getStats(): { isRedis: boolean; hits: number; misses: number; memoryItems?: number };
}

class InMemoryCache implements CacheStore {
  private store = new Map<string, { value: string; expiresAt: number }>();
  public hits = 0;
  public misses = 0;

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });

    // Simple cleanup if store grows large
    if (this.store.size > 2000) {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (now > v.expiresAt) this.store.delete(k);
      }
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  getStats() {
    return {
      isRedis: false,
      hits: this.hits,
      misses: this.misses,
      memoryItems: this.store.size,
    };
  }
}

class RedisCacheManager {
  private redisClient: Redis | null = null;
  private memoryFallback = new InMemoryCache();
  private redisConnected = false;
  private hits = 0;
  private misses = 0;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    try {
      this.redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't block if Redis server isn't running
      });

      this.redisClient
        .connect()
        .then(() => {
          this.redisConnected = true;
          logger.info({ msg: 'Redis cache connected successfully', url: redisUrl });
        })
        .catch((err) => {
          this.redisConnected = false;
          logger.info({ msg: 'Redis unavailable, using in-memory cache fallback', error: err.message });
        });

      this.redisClient.on('error', (err) => {
        if (this.redisConnected) {
          this.redisConnected = false;
          logger.warn({ msg: 'Redis connection dropped, failing over to in-memory cache', error: err.message });
        }
      });
    } catch {
      this.redisConnected = false;
    }
  }

  /**
   * Normalizes URL to create a unique cache key.
   */
  public normalizeCacheKey(url: string): string {
    const cleanUrl = url.trim().toLowerCase().replace(/\/+$/, '');
    return `audit_cache:${Buffer.from(cleanUrl).toString('base64url')}`;
  }

  async get<T>(key: string): Promise<{ data: T; hit: boolean } | null> {
    try {
      if (this.redisConnected && this.redisClient) {
        const cachedStr = await this.redisClient.get(key);
        if (cachedStr) {
          this.hits++;
          return { data: JSON.parse(cachedStr) as T, hit: true };
        }
        this.misses++;
        return null;
      }
    } catch {
      // Fallback on Redis read error
    }

    const memoryVal = await this.memoryFallback.get(key);
    if (memoryVal) {
      return { data: JSON.parse(memoryVal) as T, hit: true };
    }
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const stringified = JSON.stringify(value);

    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.setex(key, ttlSeconds, stringified);
      } catch {
        // Fall back to memory
      }
    }

    await this.memoryFallback.set(key, stringified, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        // ignore
      }
    }
    await this.memoryFallback.del(key);
  }

  getStats() {
    const memStats = this.memoryFallback.getStats();
    return {
      isRedis: this.redisConnected,
      hits: this.hits + memStats.hits,
      misses: this.misses + memStats.misses,
      hitRatio:
        this.hits + memStats.hits + this.misses + memStats.misses > 0
          ? ((this.hits + memStats.hits) / (this.hits + memStats.hits + this.misses + memStats.misses)).toFixed(3)
          : '0.000',
      memoryItems: memStats.memoryItems,
    };
  }
}

export const redisCache = new RedisCacheManager();
