import 'dotenv/config';

function required(name, value) {
  if (!value || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

export const config = {
  env: NODE_ENV,
  isProd,
  port: parseInt(process.env.PORT || '8080', 10),
  publicBackendUrl: process.env.PUBLIC_BACKEND_URL || 'http://localhost:8080',
  // Optional override for where uploaded thumbnails are written (e.g. a
  // Render persistent disk). Defaults to backend/uploads.
  uploadDir: process.env.UPLOAD_DIR || '',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  telegram: {
    botToken: required('BOT_TOKEN', process.env.BOT_TOKEN),
    miniAppUrl: process.env.MINI_APP_URL || 'http://localhost:5173',
    botMode: process.env.BOT_MODE || 'polling',
    webhookDomain: process.env.BOT_WEBHOOK_DOMAIN || '',
    initDataMaxAgeSeconds: parseInt(process.env.INITDATA_MAX_AGE_SECONDS || '86400', 10),
  },

  auth: {
    jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
    grantSecret: required('GRANT_SECRET', process.env.GRANT_SECRET),
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    adminPassword: required('ADMIN_PASSWORD', process.env.ADMIN_PASSWORD),
  },

  ads: {
    // "manual" is dev-only and stripped in production below.
    enabledProviders: (process.env.ENABLED_AD_PROVIDERS || 'manual')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    s2sSecret: process.env.AD_S2S_SECRET || '',
  },

  adsterra: {
    smartlinkUrl: process.env.ADSTERRA_SMARTLINK_URL || '',
  },
};

// Hard guard: never allow the simulated "manual" provider in production.
if (config.isProd) {
  config.ads.enabledProviders = config.ads.enabledProviders.filter(
    (p) => p !== 'manual'
  );
}

export default config;
