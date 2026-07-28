import { AppError } from '../middleware/errorHandler';

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

export interface AuditResult {
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
    overall: number; // 0-100
    security: number; // 0-100
    seo: number; // 0-100
    performance: number; // 0-100
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
    compression: string; // gzip, br, none
    cacheControl?: string;
    etag?: string;
    recommendations: string[];
  };

  headers: Record<string, string>;
}

export class AuditService {
  /**
   * Performs a comprehensive URL audit with configurable timeout.
   */
  public async performAudit(targetUrl: string, timeoutMs: number = 5000): Promise<AuditResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = performance.now();
    let ttfbMs = 0;
    const redirects: RedirectHop[] = [];

    try {
      let currentUrl = targetUrl;
      let response: Response | null = null;
      let hopsCount = 0;
      const maxHops = 5;

      // Custom fetch loop to capture redirects
      while (hopsCount < maxHops) {
        const fetchStartTime = performance.now();

        const res = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'PagePulse-URL-Auditor/1.0 (Digital Heroes Assignment Audit Engine)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
          },
          signal: controller.signal,
          redirect: 'manual', // handle manually to track chain
        });

        const fetchEndTime = performance.now();
        if (ttfbMs === 0) {
          ttfbMs = Math.round(fetchEndTime - fetchStartTime);
        }

        // Handle redirect status codes 301, 302, 303, 307, 308
        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const location = res.headers.get('location');
          redirects.push({ url: currentUrl, statusCode: res.status });

          if (!location) {
            response = res;
            break;
          }

          // Resolve relative redirect URLs
          currentUrl = new URL(location, currentUrl).toString();
          hopsCount++;
        } else {
          response = res;
          break;
        }
      }

      clearTimeout(timer);

      if (!response) {
        throw new AppError('Failed to establish connection to target server.', 502, 'UPSTREAM_ERROR');
      }

      const durationMs = Math.round(performance.now() - startTime);

      // Extract raw response text if HTML or json
      const contentType = response.headers.get('content-type') || 'unknown';
      let htmlContent = '';

      if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
        htmlContent = await response.text();
      }

      const contentLengthHeader = response.headers.get('content-length');
      const contentLengthBytes = contentLengthHeader
        ? parseInt(contentLengthHeader, 10)
        : Buffer.byteLength(htmlContent);

      // Extract all headers into dictionary
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key.toLowerCase()] = val;
      });

      // Analyze Security Headers
      const securityAnalysis = this.analyzeSecurityHeaders(responseHeaders, currentUrl);

      // Analyze SEO & Meta Tags
      const seoAnalysis = this.analyzeSeo(htmlContent);

      // Analyze Performance
      const performanceAnalysis = this.analyzePerformance(durationMs, ttfbMs, responseHeaders, contentLengthBytes);

      // Calculate Composite Scores
      const overallScore = Math.round(
        securityAnalysis.score * 0.35 + seoAnalysis.score * 0.35 + performanceAnalysis.score * 0.30
      );

      return {
        url: targetUrl,
        finalUrl: currentUrl,
        auditedAt: new Date().toISOString(),
        durationMs,
        ttfbMs,
        statusCode: response.status,
        statusText: response.statusText || (response.status === 200 ? 'OK' : 'Response Received'),
        contentLengthBytes,
        contentType,
        serverHeader: responseHeaders['server'],
        isHttps: currentUrl.startsWith('https://'),
        
        scores: {
          overall: overallScore,
          security: securityAnalysis.score,
          seo: seoAnalysis.score,
          performance: performanceAnalysis.score,
        },

        redirects,

        security: {
          grade: securityAnalysis.grade,
          headers: securityAnalysis.checks,
          missingCount: securityAnalysis.missingCount,
          recommendations: securityAnalysis.recommendations,
        },

        seo: {
          title: seoAnalysis.title,
          description: seoAnalysis.description,
          canonical: seoAnalysis.canonical,
          viewport: seoAnalysis.viewport,
          ogTitle: seoAnalysis.ogTitle,
          ogDescription: seoAnalysis.ogDescription,
          ogImage: seoAnalysis.ogImage,
          metaChecks: seoAnalysis.metaChecks,
          recommendations: seoAnalysis.recommendations,
        },

        performance: {
          latencyMs: durationMs,
          ttfbMs,
          compression: performanceAnalysis.compression,
          cacheControl: responseHeaders['cache-control'],
          etag: responseHeaders['etag'],
          recommendations: performanceAnalysis.recommendations,
        },

        headers: responseHeaders,
      };
    } catch (err: any) {
      clearTimeout(timer);

      if (err.name === 'AbortError') {
        const elapsed = Math.round(performance.now() - startTime);
        throw new AppError(
          `Audit request timed out after ${timeoutMs}ms (elapsed: ${elapsed}ms).`,
          504,
          'HTTP_TIMEOUT',
          { timeoutMs, elapsedMs: elapsed, url: targetUrl }
        );
      }

      if (err instanceof AppError) throw err;

      throw new AppError(
        `Failed to reach target URL: ${err.message || 'Network error or DNS failure'}.`,
        502,
        'TARGET_UNREACHABLE',
        { originalError: err.message, url: targetUrl }
      );
    }
  }

  private analyzeSecurityHeaders(headers: Record<string, string>, currentUrl: string) {
    const isHttps = currentUrl.startsWith('https://');

    const checks: SecurityHeaderCheck[] = [
      {
        header: 'strict-transport-security',
        present: Boolean(headers['strict-transport-security']),
        value: headers['strict-transport-security'],
        importance: 'CRITICAL',
        description: 'Enforces encrypted HTTPS connections and protects against protocol downgrade attacks.',
      },
      {
        header: 'content-security-policy',
        present: Boolean(headers['content-security-policy']),
        value: headers['content-security-policy'],
        importance: 'CRITICAL',
        description: 'Restricts script sources to prevent Cross-Site Scripting (XSS) and data injection attacks.',
      },
      {
        header: 'x-frame-options',
        present: Boolean(headers['x-frame-options']),
        value: headers['x-frame-options'],
        importance: 'HIGH',
        description: 'Prevents Clickjacking by controlling whether the site can be embedded in iframe containers.',
      },
      {
        header: 'x-content-type-options',
        present: Boolean(headers['x-content-type-options']),
        value: headers['x-content-type-options'],
        importance: 'HIGH',
        description: 'Disables MIME sniffing to protect against drive-by download attacks.',
      },
      {
        header: 'referrer-policy',
        present: Boolean(headers['referrer-policy']),
        value: headers['referrer-policy'],
        importance: 'MEDIUM',
        description: 'Controls referrer information sent in HTTP headers when navigating away.',
      },
      {
        header: 'permissions-policy',
        present: Boolean(headers['permissions-policy'] || headers['feature-policy']),
        value: headers['permissions-policy'] || headers['feature-policy'],
        importance: 'MEDIUM',
        description: 'Restricts access to browser features (camera, geolocation, microphone).',
      },
    ];

    const recommendations: string[] = [];
    let score = 100;

    if (!isHttps) {
      score -= 30;
      recommendations.push('Migrate target site to HTTPS for transport encryption.');
    }

    let missingCount = 0;
    checks.forEach((chk) => {
      if (!chk.present) {
        missingCount++;
        if (chk.importance === 'CRITICAL') score -= 20;
        else if (chk.importance === 'HIGH') score -= 12;
        else score -= 6;

        recommendations.push(`Add missing HTTP security header: '${chk.header}'.`);
      }
    });

    score = Math.max(0, Math.min(100, score));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';

    return { score, grade, checks, missingCount, recommendations };
  }

  private analyzeSeo(html: string) {
    if (!html) {
      return {
        score: 50,
        title: undefined,
        description: undefined,
        canonical: undefined,
        viewport: undefined,
        ogTitle: undefined,
        ogDescription: undefined,
        ogImage: undefined,
        metaChecks: [],
        recommendations: ['Target page did not return HTML content for SEO analysis.'],
      };
    }

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i) ||
                      html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : undefined;

    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["'](.*?)["']/i);
    const canonical = canonicalMatch ? canonicalMatch[1].trim() : undefined;

    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["'](.*?)["']/i);
    const viewport = viewportMatch ? viewportMatch[1].trim() : undefined;

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/i);
    const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : undefined;

    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/i);
    const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : undefined;

    const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/i);
    const ogImage = ogImgMatch ? ogImgMatch[1].trim() : undefined;

    const metaChecks: MetaTagCheck[] = [
      {
        tag: 'Title Tag',
        present: Boolean(title),
        value: title,
        recommendation: title ? (title.length < 30 || title.length > 60 ? 'Optimal title length is between 30 and 60 characters.' : undefined) : 'Add a descriptive <title> tag.',
      },
      {
        tag: 'Meta Description',
        present: Boolean(description),
        value: description,
        recommendation: description ? (description.length < 50 || description.length > 160 ? 'Meta description should be between 50 and 160 characters.' : undefined) : 'Add a concise <meta name="description"> tag.',
      },
      {
        tag: 'Canonical Link',
        present: Boolean(canonical),
        value: canonical,
        recommendation: canonical ? undefined : 'Add <link rel="canonical"> to prevent duplicate content issues.',
      },
      {
        tag: 'Mobile Viewport',
        present: Boolean(viewport),
        value: viewport,
        recommendation: viewport ? undefined : 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile responsiveness.',
      },
      {
        tag: 'Open Graph Metadata',
        present: Boolean(ogTitle || ogDescription || ogImage),
        value: ogTitle ? `Title: ${ogTitle}` : undefined,
        recommendation: ogTitle ? undefined : 'Include Open Graph tags (og:title, og:image, og:description) for social sharing.',
      },
    ];

    let score = 100;
    const recommendations: string[] = [];

    metaChecks.forEach((chk) => {
      if (!chk.present) {
        score -= 15;
        if (chk.recommendation) recommendations.push(chk.recommendation);
      } else if (chk.recommendation) {
        score -= 5;
        recommendations.push(chk.recommendation);
      }
    });

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      title,
      description,
      canonical,
      viewport,
      ogTitle,
      ogDescription,
      ogImage,
      metaChecks,
      recommendations,
    };
  }

  private analyzePerformance(durationMs: number, ttfbMs: number, headers: Record<string, string>, sizeBytes: number) {
    let score = 100;
    const recommendations: string[] = [];

    // Latency scoring
    if (durationMs > 2000) {
      score -= 30;
      recommendations.push(`High total response latency (${durationMs}ms). Aim for under 1000ms.`);
    } else if (durationMs > 1000) {
      score -= 15;
      recommendations.push(`Moderate latency (${durationMs}ms). Consider CDN caching.`);
    }

    // TTFB scoring
    if (ttfbMs > 800) {
      score -= 20;
      recommendations.push(`Slow Time To First Byte (${ttfbMs}ms). Optimize backend database and server logic.`);
    }

    // Compression check
    const encoding = headers['content-encoding'] || 'none';
    if (encoding === 'none' && sizeBytes > 1024) {
      score -= 15;
      recommendations.push('Enable Gzip or Brotli HTTP compression to reduce payload transfer time.');
    }

    // Caching check
    if (!headers['cache-control']) {
      score -= 10;
      recommendations.push('Specify explicit Cache-Control headers for static assets.');
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      compression: encoding,
      recommendations,
    };
  }
}

export const auditService = new AuditService();
