/**
 * A small fixed-window limiter for the routes that move value.
 *
 * /api/session/settle takes no authentication — a judge opening the preview
 * outside World App has no wallet to sign with, and demo mode exists so that
 * flow still works — but it settles from an operator-held account, so an
 * unthrottled endpoint is a scripted drain waiting to happen. The stake ceiling
 * bounds what one call can move; this is meant to bound how many a caller gets
 * — with the large caveat below about where it actually manages that.
 *
 * In-process, and measured rather than assumed: on a single long-lived server
 * this binds exactly as configured — ten through, then 429. On the Vercel
 * deployment it did not bind at all across twelve consecutive requests, because
 * each instance keeps its own Map and requests are spread across instances that
 * may each start cold. Treat it as protection for a self-hosted or long-lived
 * process and as approximately nothing on serverless.
 *
 * It is kept because it costs nothing and helps where it applies, but the real
 * bound on that deployment today is MAX_STAKE_HBAR, which caps a single call.
 * A limit that actually holds across instances needs shared state — the same
 * shared store the forfeit ledger wants, and the same provisioning decision.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Entries are only cleaned when a key is touched, so the map cannot grow unboundedly. */
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Sent as Retry-After when blocked. */
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    // Opportunistic sweep: without it a long-lived instance accumulates a key
    // per caller forever.
    if (windows.size >= MAX_TRACKED_KEYS) {
      for (const [k, w] of windows) if (now >= w.resetAt) windows.delete(k);
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/**
 * Best-effort caller identity.
 *
 * x-forwarded-for is client-supplied and spoofable in general, but on Vercel the
 * platform sets it, so the left-most entry is the real peer. Falls back to a
 * single shared bucket rather than to no limit at all: degrading to "everyone
 * shares one allowance" is the safe direction for an endpoint that moves money.
 */
export function callerKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${scope}:${ip}`;
}
