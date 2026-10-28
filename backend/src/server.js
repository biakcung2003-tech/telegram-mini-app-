import config from './config.js';
import { createApp } from './app.js';
import { bootstrap } from './db/seed.js';
import { launchBot } from './bot.js';

async function main() {
  // Ensure DB schema + bootstrap admin exist before serving.
  bootstrap();

  const app = createApp();

  // Launch the Telegram bot (polling in dev, webhook in prod).
  try {
    await launchBot(app);
  } catch (e) {
    console.error('[bot] failed to launch:', e.message);
  }

  app.listen(config.port, () => {
    console.log(`\n🚀 Backend listening on http://localhost:${config.port}  (${config.env})`);
    console.log(`   Health: http://localhost:${config.port}/health`);
    if (config.isProd && config.ads.enabledProviders.includes('manual')) {
      console.warn('   ⚠️  manual ad provider should not be enabled in production!');
    }
  });
}

main().catch((e) => {
  console.error('Fatal startup error:', e);
  process.exit(1);
});
