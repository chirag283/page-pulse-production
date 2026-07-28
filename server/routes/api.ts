import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateAndNormalizeUrl } from '../utils/urlValidator';
import { redisCache } from '../cache/redisCache';
import { concurrencyManager } from '../services/concurrencyManager';
import { auditService, AuditResult } from '../services/auditService';
import { logAuditRequest } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import fs from 'fs';
import path from 'path';
import yaml from 'yamljs';

export const apiRouter = Router();

// Zod validation schemas
const SingleAuditSchema = z.object({
  url: z.string().min(1, 'URL parameter is required.'),
  forceFresh: z.boolean().optional().default(false),
  timeoutMs: z.number().int().min(1000).max(30000).optional().default(5000),
});

const BatchAuditSchema = z.object({
  urls: z.array(z.string()).min(1, 'At least one URL is required.').max(10, 'Maximum 10 URLs permitted per batch request.'),
  forceFresh: z.boolean().optional().default(false),
  timeoutMs: z.number().int().min(1000).max(30000).optional().default(5000),
});

// Telemetry latency tracker for stats
const latencyHistory: number[] = [];
function recordLatency(ms: number) {
  latencyHistory.push(ms);
  if (latencyHistory.length > 500) latencyHistory.shift();
}

function calculatePercentiles() {
  if (latencyHistory.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const sorted = [...latencyHistory].sort((a, b) => a - b);
  const getP = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
  return {
    p50: getP(0.5),
    p95: getP(0.95),
    p99: getP(0.99),
  };
}

/**
 * POST /api/audit
 * Single URL audit endpoint
 */
apiRouter.post('/audit', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
  const startTime = performance.now();

  try {
    // 1. Zod Body Validation
    const parsed = SingleAuditSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message || 'Invalid request body parameters.';
      throw new AppError(issue, 400, 'INVALID_INPUT', { issues: parsed.error.issues });
    }

    const { url: rawUrl, forceFresh, timeoutMs } = parsed.data;

    // 2. SSRF & URL Format Validation
    const validation = validateAndNormalizeUrl(rawUrl);
    if (!validation.valid || !validation.normalizedUrl) {
      throw new AppError(
        validation.reason || 'Invalid URL provided.',
        400,
        validation.code || 'INVALID_URL',
        { inputUrl: rawUrl }
      );
    }

    const normalizedUrl = validation.normalizedUrl;
    const cacheKey = redisCache.normalizeCacheKey(normalizedUrl);

    // 3. Cache Lookup
    if (!forceFresh) {
      const cached = await redisCache.get<AuditResult>(cacheKey);
      if (cached) {
        const duration = Math.round(performance.now() - startTime);
        logAuditRequest({
          requestId,
          url: normalizedUrl,
          method: 'POST',
          ip: clientIp,
          status: 200,
          durationMs: duration,
          cacheHit: true,
        });

        recordLatency(duration);

        return res.json({
          success: true,
          requestId,
          cached: true,
          data: cached.data,
        });
      }
    }

    // 4. Concurrency Queue Execution
    const auditData = await concurrencyManager.execute(() =>
      auditService.performAudit(normalizedUrl, timeoutMs)
    );

    // 5. Cache Write (TTL 300s = 5 minutes)
    await redisCache.set(cacheKey, auditData, 300);

    const duration = Math.round(performance.now() - startTime);
    recordLatency(duration);

    logAuditRequest({
      requestId,
      url: normalizedUrl,
      method: 'POST',
      ip: clientIp,
      status: auditData.statusCode,
      durationMs: duration,
      cacheHit: false,
    });

    return res.json({
      success: true,
      requestId,
      cached: false,
      data: auditData,
    });
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    logAuditRequest({
      requestId,
      url: req.body?.url || 'unknown',
      method: 'POST',
      ip: clientIp,
      status: err.statusCode || 500,
      durationMs: duration,
      cacheHit: false,
      errorCode: err.code || 'AUDIT_ERROR',
      errorMessage: err.message,
    });

    next(err);
  }
});

/**
 * POST /api/audit/batch
 * Batch URL audit endpoint
 */
apiRouter.post('/audit/batch', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId || `req_batch_${Date.now()}`;

  try {
    const parsed = BatchAuditSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid batch payload.', 400, 'INVALID_INPUT');
    }

    const { urls, forceFresh, timeoutMs } = parsed.data;

    const results = await Promise.all(
      urls.map(async (rawUrl) => {
        const validation = validateAndNormalizeUrl(rawUrl);
        if (!validation.valid || !validation.normalizedUrl) {
          return {
            url: rawUrl,
            success: false,
            error: { code: validation.code || 'INVALID_URL', message: validation.reason },
          };
        }

        const normalized = validation.normalizedUrl;
        const cacheKey = redisCache.normalizeCacheKey(normalized);

        try {
          if (!forceFresh) {
            const cached = await redisCache.get<AuditResult>(cacheKey);
            if (cached) {
              return { url: normalized, success: true, cached: true, data: cached.data };
            }
          }

          const auditData = await concurrencyManager.execute(() =>
            auditService.performAudit(normalized, timeoutMs)
          );
          await redisCache.set(cacheKey, auditData, 300);

          return { url: normalized, success: true, cached: false, data: auditData };
        } catch (err: any) {
          return {
            url: normalized,
            success: false,
            error: { code: err.code || 'AUDIT_FAILED', message: err.message },
          };
        }
      })
    );

    return res.json({
      success: true,
      requestId,
      totalCount: urls.length,
      results,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/health
 * System Health Check Endpoint
 */
apiRouter.get('/health', (_req: Request, res: Response) => {
  const cacheStats = redisCache.getStats();
  const queueStats = concurrencyManager.getStats();

  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Page Pulse URL Audit Engine',
    uptimeSeconds: Math.floor(process.uptime()),
    cache: cacheStats,
    concurrency: queueStats,
    memoryUsageMb: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
});

/**
 * GET /api/stats
 * Telemetry & SLA Metrics
 */
apiRouter.get('/stats', (_req: Request, res: Response) => {
  const cacheStats = redisCache.getStats();
  const queueStats = concurrencyManager.getStats();
  const percentiles = calculatePercentiles();

  return res.json({
    timestamp: new Date().toISOString(),
    latencyMs: percentiles,
    cache: cacheStats,
    concurrency: queueStats,
    slaTarget: {
      availabilityPercent: 99.9,
      p95LatencyMs: 1500,
    },
  });
});

/**
 * GET /api/docs/swagger.json
 * OpenAPI specification JSON
 */
apiRouter.get('/docs/swagger.json', (_req: Request, res: Response) => {
  const swaggerPath = path.join(process.cwd(), 'swagger.yaml');
  if (fs.existsSync(swaggerPath)) {
    const doc = yaml.load(swaggerPath);
    return res.json(doc);
  }
  return res.status(404).json({ error: 'Swagger document not found' });
});
