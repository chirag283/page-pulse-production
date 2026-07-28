import pino from 'pino';

// Production structured Pino logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    service: 'page-pulse-audit-service',
    env: process.env.NODE_ENV || 'development',
  },
});

export const logAuditRequest = (data: {
  requestId: string;
  url: string;
  method: string;
  ip: string;
  status?: number;
  durationMs?: number;
  cacheHit?: boolean;
  errorCode?: string;
  errorMessage?: string;
}) => {
  logger.info({
    event: 'URL_AUDIT_REQUEST',
    requestId: data.requestId,
    url: data.url,
    method: data.method,
    ip: data.ip,
    statusCode: data.status,
    durationMs: data.durationMs,
    cacheHit: data.cacheHit ?? false,
    error: data.errorCode ? { code: data.errorCode, message: data.errorMessage } : undefined,
  });
};
