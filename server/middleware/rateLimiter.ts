import { Request, Response, NextFunction } from 'express';

interface ClientRateLimitState {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private clients = new Map<string, ClientRateLimitState>();
  public totalBlocked = 0;

  constructor(
    windowMs: number = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    maxRequests: number = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100)
  ) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodic cleanup every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [ip, state] of this.clients.entries()) {
        if (now > state.resetTime) {
          this.clients.delete(ip);
        }
      }
    }, 120000);
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const now = Date.now();
      let state = this.clients.get(clientIp);

      if (!state || now > state.resetTime) {
        state = { count: 1, resetTime: now + this.windowMs };
        this.clients.set(clientIp, state);
      } else {
        state.count++;
      }

      const remaining = Math.max(0, this.maxRequests - state.count);
      const retryAfterSeconds = Math.ceil((state.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(state.resetTime / 1000));

      if (state.count > this.maxRequests) {
        this.totalBlocked++;
        res.setHeader('Retry-After', retryAfterSeconds);

        const requestId = (req as any).requestId || `req_${Date.now()}`;

        return res.status(429).json({
          success: false,
          requestId,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit of ${this.maxRequests} requests per ${Math.round(this.windowMs / 1000)}s exceeded for IP ${clientIp}.`,
            details: {
              retryAfterSeconds,
              limit: this.maxRequests,
              windowMs: this.windowMs,
            },
          },
        });
      }

      next();
    };
  }

  public getStats() {
    return {
      activeClientsTracked: this.clients.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
      totalBlocked: this.totalBlocked,
    };
  }
}

export const rateLimiter = new RateLimiter();
