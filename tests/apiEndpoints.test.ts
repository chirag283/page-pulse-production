import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { apiRouter } from '../server/routes/api';
import { errorHandler } from '../server/middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);
app.use('/api', errorHandler);

describe('API Endpoints Suite', () => {
  it('GET /api/health should return 200 OK with health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('cache');
  });

  it('GET /api/stats should return SLA telemetry metrics', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('latencyMs');
    expect(res.body).toHaveProperty('slaTarget');
  });

  it('POST /api/audit should reject SSRF target (localhost)', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: 'http://127.0.0.1:8080' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SSRF_BLOCKED');
  });

  it('POST /api/audit should reject invalid URL formats', async () => {
    const res = await request(app)
      .post('/api/audit')
      .send({ url: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
