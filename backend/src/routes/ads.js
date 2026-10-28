import { Router } from 'express';
import { z } from 'zod';
import { requireTelegramUser } from '../middleware/auth.js';
import { unlockLimiter } from '../middleware/rateLimit.js';
import {
  startAdSession,
  verifyAdSession,
  finalizeUnlock,
  markSmartlinkOpened,
} from '../services/unlockService.js';

const router = Router();

const startSchema = z.object({
  contentId: z.number().int().positive(),
  providerKey: z.string().min(1).max(64),
});

/**
 * POST /api/ads/start  (user)
 * Begin a rewarded-ad session after explicit consent. Returns provider client
 * config + a server-issued nonce.
 */
router.post('/start', requireTelegramUser, unlockLimiter, (req, res, next) => {
  try {
    const parsed = startSchema.parse({
      contentId: Number(req.body?.contentId),
      providerKey: String(req.body?.providerKey || ''),
    });
    const out = startAdSession({
      userId: req.user.id,
      contentId: parsed.contentId,
      providerKey: parsed.providerKey,
      ip: req.ip,
      userAgent: req.get('user-agent') || '',
    });
    res.json(out);
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request', detail: e.errors });
    }
    next(e);
  }
});

/**
 * POST /api/ads/smartlink-opened  (user)
 * SmartLink gate only: record (server-side) that the user opened the link, so
 * the cooldown is measured from a timestamp the client cannot forge.
 */
router.post('/smartlink-opened', requireTelegramUser, unlockLimiter, (req, res, next) => {
  try {
    const sessionId = String(req.body?.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const result = markSmartlinkOpened({ userId: req.user.id, sessionId });
    if (!result.ok) {
      return res.status(result.status || 400).json({ ok: false, error: result.reason });
    }
    res.json({ ok: true, cooldownSeconds: result.cooldownSeconds });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/ads/callback/:providerKey  (SERVER-TO-SERVER, no user auth)
 * Called by the ad network when a reward is earned. This is the authoritative
 * verification path for production. The body is provider-specific; the provider
 * validates its own signature. We never trust this blindly.
 */
router.post('/callback/:providerKey', async (req, res, next) => {
  try {
    const sessionId = String(req.body?.sessionId || req.query.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const result = await verifyAdSession({ sessionId, payload: req.body });
    if (!result.ok) {
      return res.status(result.status || 400).json({ ok: false, error: result.reason });
    }
    // Networks typically only need a 200 OK. We don't return the grant here.
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/ads/verify  (user)
 * Client asks the server to confirm the session reached "verified" (either via
 * the S2S callback above, or a provider poll). On success returns a one-time
 * grant token. For the dev "manual" provider, the client echoes the nonce.
 */
router.post('/verify', requireTelegramUser, unlockLimiter, async (req, res, next) => {
  try {
    const sessionId = String(req.body?.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const result = await verifyAdSession({
      sessionId,
      payload: { ...req.body, _userId: req.user.id },
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ ok: false, error: result.reason });
    }
    res.json({ ok: true, grant: result.grant });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/ads/unlock  (user)
 * Finalize unlock with the single-use grant token.
 */
router.post('/unlock', requireTelegramUser, unlockLimiter, (req, res, next) => {
  try {
    const grantToken = String(req.body?.grant || '');
    if (!grantToken) return res.status(400).json({ error: 'grant required' });
    const result = finalizeUnlock({ userId: req.user.id, grantToken });
    if (!result.ok) {
      return res.status(result.status || 400).json({ ok: false, error: result.reason });
    }
    res.json({ ok: true, expiresAt: result.expiresAt || null });
  } catch (e) {
    next(e);
  }
});

export default router;
