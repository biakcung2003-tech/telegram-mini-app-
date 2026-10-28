import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';

import contentRoutes from './routes/content.js';
import adsRoutes from './routes/ads.js';
import adminAuthRoutes from './routes/adminAuth.js';
import adminRoutes from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow thumbnails cross-origin
    })
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow no-origin (server-to-server, curl) and configured origins.
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin not allowed: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Static thumbnails (honor UPLOAD_DIR override, e.g. a persistent disk)
  const uploadsPath = config.uploadDir
    ? resolve(config.uploadDir)
    : resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsPath));

  app.get('/health', (req, res) => res.json({ ok: true, env: config.env }));

  // Admin API — mounted first so its specific paths match before the broad
  // user router (which applies Telegram-initData auth to all its routes).
  app.use('/api/admin', apiLimiter, adminAuthRoutes);
  app.use('/api/admin', adminRoutes);

  // Ad/unlock API (own per-route auth + stricter limiter inside).
  app.use('/api/ads', adsRoutes);

  // Public/user API (rate-limited, Telegram-initData auth inside the router).
  app.use('/api', apiLimiter, contentRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
