import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import fs from 'fs';
import { apiRouter } from './server/routes/api';
import { rateLimiter } from './server/middleware/rateLimiter';
import { errorHandler } from './server/middleware/errorHandler';
import { logger } from './server/utils/logger';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request ID middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    next();
  });

  // CORS headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    next();
  });

  // Swagger OpenAPI Documentation UI
  const swaggerPath = path.join(process.cwd(), 'swagger.yaml');
  if (fs.existsSync(swaggerPath)) {
    try {
      const swaggerDocument = yaml.load(swaggerPath);
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Page Pulse API Specification',
      }));
      logger.info({ msg: 'Swagger UI docs mounted at /api-docs' });
    } catch (err: any) {
      logger.warn({ msg: 'Failed to initialize Swagger UI', error: err.message });
    }
  }

  // Rate Limiter applied to API
  app.use('/api', rateLimiter.middleware());

  // Mount API router
  app.use('/api', apiRouter);

  // Global Error Handler for API
  app.use('/api', errorHandler);

  // Vite Middleware for Frontend in Dev or Static Serve in Production
  if (process.env.NODE_ENV !== 'production') {
    logger.info({ msg: 'Mounting Vite dev server middleware' });
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    logger.info({ msg: 'Serving production build from dist/' });
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ msg: `🚀 Page Pulse Production Audit Service running on http://0.0.0.0:${PORT}` });
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
