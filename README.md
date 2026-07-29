# ⚡ Page Pulse - Production URL Audit Service

[![CI/CD Pipeline](https://github.com/vanguardhacktivist2002/page-pulse/actions/workflows/ci.yml/badge.svg)](https://github.com/vanguardhacktivist2002/page-pulse/actions/workflows/ci.yml)
![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

Page Pulse is a high-performance, production-grade URL audit engine and analytics dashboard built for the **Digital Heroes Software Development Qualification Task**.

Designed for high concurrency (10,000+ audits/day, 500 peak concurrent requests), Page Pulse delivers real-time HTTP security audits, SEO metadata analysis, performance breakdown, SSRF protection, Redis caching with in-memory fallbacks, and comprehensive telemetry.

---

## 🌟 Key Capabilities

* **SSRF Defense & URL Validation**: Restricts input to HTTP/HTTPS protocols, blocking `localhost`, private IPv4/IPv6 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.169.254), and internal domain names (.local, .internal).
* **Comprehensive URL Auditing**:
  * **Security Headers Audit**: Evaluates HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy with letter grade scoring (A+ to F).
  * **SEO & Meta Tag Analysis**: Inspects Title length, Meta Description, Canonical URLs, Mobile Viewport, and Open Graph tags.
  * **Performance & Protocol Metrics**: Measures TTFB, total latency, content size, HTTP compression (gzip/brotli), cache control, and SSL certificate status.
* **Concurrency Semaphore Queue**: Configurable queue (`MAX_CONCURRENCY=500`) handles traffic bursts without dropping connections or overloading CPU resources.
* **Redis Cache with In-Memory Fallback**: Caches normalized URL audits for 300s TTL. If Redis is unavailable, automatically falls back to an in-memory LRU store.
* **Sliding Window Rate Limiter**: Limits requests per client IP (default 100 req/min) returning structured `429 Too Many Requests` responses with `Retry-After` headers.
* **Interactive OpenAPI Docs**: Exposes Swagger UI at `/api-docs` and directly inside the web dashboard.
* **Structured Pino JSON Logs**: Outputs standardized JSON logs containing `requestId`, timestamp, status code, latency, cache hit/miss, and error details.

---

## 🏗️ Architecture Overview

```
[Client Dashboard / API Request]
              │
              ▼
   ┌──────────────────────┐
   │  Sliding Rate Limit  │  ---> (HTTP 429 if limit exceeded)
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ SSRF & Normalizer    │  ---> (HTTP 400 if private IP / invalid URL)
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐  Cache HIT
   │  Redis / Mem Cache   ├───────────────► [Return Cached JSON]
   └──────────┬───────────┘
              │ Cache MISS
              ▼
   ┌──────────────────────┐
   │ Concurrency Semaphore│
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │   URL Audit Engine   │  ---> [Fetch target with 5s AbortController]
   └──────────┬───────────┘
              │
              ▼
   [Store in Cache & Return Audit Result]
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port for Node Express server |
| `NODE_ENV` | `development` | Runtime mode (`development` or `production`) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `MAX_CONCURRENCY` | `500` | Max concurrent active audit tasks |
| `MAX_QUEUE_LENGTH` | `1000` | Max queued tasks before rejecting |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limiting sliding window in ms |
| `RATE_LIMIT_MAX_REQUESTS`| `100` | Max requests per IP in window |
| `AUDIT_TIMEOUT_MS` | `5000` | Max duration for external URL audits |
| `LOG_LEVEL` | `info` | Pino log verbosity (`debug`, `info`, `warn`, `error`) |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
* Node.js >= 20.0.0
* npm >= 10.0.0
* Redis (Optional - in-memory fallback will activate if absent)

### Installation & Run

```bash
# 1. Clone & install dependencies
git clone https://github.com/vanguardhacktivist2002/page-pulse.git
cd page-pulse
npm install

# 2. Start development server (Express + Vite on Port 3000)
npm run dev

# 3. Open application in browser
# http://localhost:3000
```

---

## 🐳 Docker & Docker Compose

Run full stack with Redis container in one command:

```bash
# Start containerized application with Redis service
docker-compose up --build -d

# View real-time structured logs
docker-compose logs -f page-pulse-app

# Stop containers
docker-compose down
```

---

## 🧪 Testing

Run comprehensive Vitest test suite covering URL validation, SSRF checks, cache logic, rate limiting, and API routes:

```bash
# Run unit and integration tests
npm run test

# Run type checker
npm run lint
```

---

## 📚 API Endpoints

### 1. Perform Single URL Audit
`POST /api/audit`
```json
// Request Body
{
  "url": "https://example.com",
  "forceFresh": false,
  "timeoutMs": 5000
}

// Response (200 OK)
{
  "success": true,
  "requestId": "req_1722123456_a1b2c",
  "cached": false,
  "data": {
    "url": "https://example.com",
    "finalUrl": "https://example.com",
    "durationMs": 185,
    "ttfbMs": 92,
    "statusCode": 200,
    "scores": {
      "overall": 92,
      "security": 85,
      "seo": 95,
      "performance": 96
    },
    "security": {
      "grade": "A",
      "headers": [...]
    }
  }
}
```

### 2. Perform Batch Audit
`POST /api/audit/batch`
```json
{
  "urls": ["https://example.com", "https://github.com"],
  "forceFresh": false
}
```

### 3. Service Health & Metrics
* `GET /api/health` -> Service uptime, Redis connection, memory usage
* `GET /api/stats` -> P50/P95/P99 latency percentiles, cache hit ratio, queue depth
* `GET /api-docs` -> Interactive Swagger UI documentation

---

## 🔗 Live Submission & Footer Information

This application was engineered for the **Digital Heroes Software Development Qualification Task**.

* **Organization Website**: [https://digitalheroesco.com](https://digitalheroesco.com)
* **Application URL**: `https://page-pulse-production-k5ng.vercel.app/'
