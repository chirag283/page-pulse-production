import { describe, it, expect } from 'vitest';
import { redisCache } from '../server/cache/redisCache';
import { concurrencyManager } from '../server/services/concurrencyManager';

describe('Cache & Concurrency Manager Suite', () => {
  it('should normalize cache key consistently', () => {
    const key1 = redisCache.normalizeCacheKey('https://example.com/');
    const key2 = redisCache.normalizeCacheKey('https://example.com');
    expect(key1).toBe(key2);
  });

  it('should store and retrieve items from cache', async () => {
    const key = redisCache.normalizeCacheKey('https://test-cache.org');
    const mockData = { score: 95, status: 200 };

    await redisCache.set(key, mockData, 60);
    const cached = await redisCache.get<typeof mockData>(key);

    expect(cached).not.toBeNull();
    expect(cached?.hit).toBe(true);
    expect(cached?.data.score).toBe(95);
  });

  it('should track cache hits and misses in stats', () => {
    const stats = redisCache.getStats();
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('hitRatio');
  });

  it('should execute tasks within concurrency limits', async () => {
    const task = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'completed';
    };

    const res = await concurrencyManager.execute(task);
    expect(res).toBe('completed');

    const stats = concurrencyManager.getStats();
    expect(stats.totalAuditsProcessed).toBeGreaterThan(0);
  });
});
