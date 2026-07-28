export interface SecurityHeaderCheck {
  header: string;
  present: boolean;
  value?: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
}

export interface MetaTagCheck {
  tag: string;
  present: boolean;
  value?: string;
  recommendation?: string;
}

export interface RedirectHop {
  url: string;
  statusCode: number;
}

export interface AuditResultData {
  url: string;
  finalUrl: string;
  auditedAt: string;
  durationMs: number;
  ttfbMs: number;
  statusCode: number;
  statusText: string;
  contentLengthBytes: number;
  contentType: string;
  serverHeader?: string;
  isHttps: boolean;

  scores: {
    overall: number;
    security: number;
    seo: number;
    performance: number;
  };

  redirects: RedirectHop[];

  security: {
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    headers: SecurityHeaderCheck[];
    missingCount: number;
    recommendations: string[];
  };

  seo: {
    title?: string;
    description?: string;
    canonical?: string;
    viewport?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    metaChecks: MetaTagCheck[];
    recommendations: string[];
  };

  performance: {
    latencyMs: number;
    ttfbMs: number;
    compression: string;
    cacheControl?: string;
    etag?: string;
    recommendations: string[];
  };

  headers: Record<string, string>;
}

export interface ApiResponse<T> {
  success: boolean;
  requestId: string;
  cached?: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  uptimeSeconds: number;
  cache: {
    isRedis: boolean;
    hits: number;
    misses: number;
    hitRatio: string;
    memoryItems?: number;
  };
  concurrency: {
    activeWorkers: number;
    queuedRequests: number;
    maxConcurrency: number;
    maxQueueLength: number;
    totalAuditsProcessed: number;
    avgQueueWaitTimeMs: number;
  };
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

export interface StatsResponse {
  timestamp: string;
  latencyMs: {
    p50: number;
    p95: number;
    p99: number;
  };
  cache: {
    isRedis: boolean;
    hits: number;
    misses: number;
    hitRatio: string;
  };
  concurrency: {
    activeWorkers: number;
    queuedRequests: number;
    maxConcurrency: number;
    totalAuditsProcessed: number;
  };
  slaTarget: {
    availabilityPercent: number;
    p95LatencyMs: number;
  };
}
