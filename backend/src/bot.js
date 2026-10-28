import { Telegraf, Markup } from 'telegraf';
import config from './config.js';

/**
 * Telegraf bot. Exposes /start with a button that opens the Mini App.
 * The bot token is read from env and never exposed to the client.
 */

/** Telegram only allows HTTPS Web App URLs. */
function isHttpsUrl(url) {
  return typeof url === 'string' && /^https:\/\//i.test(url);
}

export function createBot() {
  const bot = new Telegraf(config.telegram.botToken);

  const miniAppUrl = config.telegram.miniAppUrl;
  const canUseWebAppButton = isHttpsUrl(miniAppUrl);

  // Only build a Web App button when the URL is HTTPS (Telegram requirement).
  const openKeyboard = canUseWebAppButton
    ? Markup.inlineKeyboard([Markup.button.webApp('🚀 Open App', miniAppUrl)])
    : null;

  async function sendOpen(ctx, lead) {
    if (canUseWebAppButton) {
      await ctx.reply(lead, openKeyboard);
    } else {
      // Dev fallback: localhost/non-HTTPS can't be a Web App button. Tell the
      // operator how to fix it instead of crashing.
      await ctx.reply(
        `${lead}\n\n⚠️ The Mini App URL is not HTTPS yet (${miniAppUrl}).\n` +
          'Telegram only opens HTTPS Mini Apps. Set MINI_APP_URL to an HTTPS URL ' +
          '(deploy to Cloudflare Pages, or use an ngrok/Cloudflare tunnel for local testing), ' +
          'then restart the bot.'
      );
    }
  }

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'there';
    await sendOpen(
      ctx,
      `Hi ${name}! 👋\n\nBrowse content and unlock premium items by watching a short rewarded ad.\n\nTap below to open the app.`
    );
  });

  bot.command('open', async (ctx) => {
    await sendOpen(ctx, 'Open the Mini App:');
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      'Commands:\n/start – welcome + open app\n/open – open the Mini App\n\nAll content unlocks are verified server-side after a rewarded ad.'
    );
  });

  // Global handler so a single bad update never crashes the process.
  bot.catch((err, ctx) => {
    console.error(`[bot] handler error for ${ctx.updateType}:`, err.message);
  });

  return bot;
}

/** Launch the bot in polling or webhook mode. Returns a webhook callback if any. */
export async function launchBot(app) {
  const bot = createBot();

  if (!isHttpsUrl(config.telegram.miniAppUrl)) {
    console.warn(
      `[bot] ⚠️  MINI_APP_URL is not HTTPS ("${config.telegram.miniAppUrl}"). ` +
        'The "Open App" button is disabled until you set an HTTPS URL.'
    );
  }

  if (config.telegram.botMode === 'webhook') {
    if (!config.telegram.webhookDomain) {
      console.warn('[bot] BOT_MODE=webhook but BOT_WEBHOOK_DOMAIN is empty — skipping webhook setup.');
    } else {
      const path = `/bot/${config.telegram.botToken}`;
      app.use(bot.webhookCallback(path));
      const url = `${config.telegram.webhookDomain}${path}`;
      await bot.telegram.setWebhook(url);
      console.log(`[bot] webhook set: ${config.telegram.webhookDomain}${path.replace(config.telegram.botToken, '***')}`);
    }
  } else {
    // Polling (good for local dev). launch() resolves only when the bot stops,
    // so we intentionally do not await it here. Any launch error (e.g. an
    // invalid token during local development) is caught and logged so it never
    // crashes the API server.
    bot
      .launch(() => console.log('[bot] polling started'))
      .catch((e) => console.error('[bot] polling error:', e.message));
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }

  return bot;
}
