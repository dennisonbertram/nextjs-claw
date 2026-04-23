# 10 — Rate Limiting

## What this gives you

Two implementations: (a) a Postgres-backed sliding window using an `UNLOGGED` table — no Redis required; (b) a Redis-backed fixed window with an atomic Lua script for sub-millisecond accuracy. Both expose the same interface. A Next.js middleware pattern that applies rate limiting to entire route groups.

## When to reach for it / when not to

- **Use Postgres-backed** (option a) when you already have Postgres and Redis isn't in the stack yet. Works well for login throttling, signup limits, password reset requests — anything under ~500 req/s per instance.
- **Use Redis-backed** (option b) when you need accuracy across multiple server instances or very high throughput (API endpoints, AI calls).
- **Use per-user limiting** for authenticated routes to prevent abuse by specific accounts.
- **Use per-IP limiting** for unauthenticated routes (login, signup, contact forms).
- **Skip rate limiting** for static asset routes (`/_next/static`, `/public`).

## Decision rationale

The Postgres option uses `UNLOGGED TABLE` which bypasses WAL (write-ahead log) for maximum insert speed. The data is lost on Postgres restart — acceptable for rate limit counters because a restart effectively resets counts (slightly more permissive, never more restrictive). The Redis option uses a `ZSET` sliding window via a Lua script that runs atomically, preventing race conditions.

`lib/rate-limit/postgres.ts` in this recipe is the **canonical** Postgres sliding-window implementation. Recipe 02 (auth) imports `rateLimit` from `lib/rate-limit/index.ts` for login throttling — there is no separate `lib/auth/rate-limit.ts`. If you are setting up auth (recipe 02), install this recipe first.

## Files the agent creates

- `lib/rate-limit/postgres.ts` — Postgres sliding window (canonical implementation)
- `lib/rate-limit/redis.ts` — Redis fixed-window (alternative)
- `lib/rate-limit/index.ts` — unified interface
- `middleware.ts` — example middleware integration

## Code

### `lib/rate-limit/postgres.ts`

Full sliding-window implementation. This is the canonical home. Recipe 02 (auth) imports from here for login rate limiting — do not create a separate `lib/auth/rate-limit.ts`.

```ts
// lib/rate-limit/postgres.ts
import { pool } from '@/lib/db';

let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  await pool.query(`
    CREATE UNLOGGED TABLE IF NOT EXISTS rate_limit_buckets (
      key        TEXT NOT NULL,
      window_end TIMESTAMPTZ NOT NULL,
      count      INT NOT NULL DEFAULT 0,
      PRIMARY KEY (key, window_end)
    );
    CREATE INDEX IF NOT EXISTS rl_window_end_idx ON rate_limit_buckets (window_end);
  `);
  tableEnsured = true;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function rateLimitPostgres(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  await ensureTable();

  const now = new Date();
  const windowEnd = new Date(Math.ceil(now.getTime() / windowMs) * windowMs);
  const windowStart = new Date(windowEnd.getTime() - windowMs);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<{ count: number }>(
      `INSERT INTO rate_limit_buckets (key, window_end, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (key, window_end)
       DO UPDATE SET count = rate_limit_buckets.count + 1
       RETURNING count`,
      [key, windowEnd],
    );

    const { rows: prev } = await client.query<{ count: number }>(
      `SELECT COALESCE(SUM(count), 0)::int AS count
       FROM rate_limit_buckets
       WHERE key = $1 AND window_end > $2 AND window_end <= $3`,
      [key, windowStart, windowEnd],
    );

    await client.query('COMMIT');

    // Async cleanup — fire and forget
    pool
      .query(`DELETE FROM rate_limit_buckets WHERE window_end < $1`, [
        new Date(now.getTime() - windowMs * 2),
      ])
      .catch(() => {});

    const overlap = 1 - (now.getTime() % windowMs) / windowMs;
    const prevCount = Number(prev[0]?.count ?? 0);
    const currentCount = Number(rows[0]?.count ?? 0);
    const weighted = Math.floor((prevCount - currentCount) * overlap + currentCount);

    return {
      allowed: weighted <= limit,
      remaining: Math.max(0, limit - weighted),
      resetAt: windowEnd,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### `lib/rate-limit/redis.ts`

```ts
// lib/rate-limit/redis.ts
// Atomic sliding window via Redis ZSET + Lua script.
// The Lua script is atomic — no race conditions.

import { redis } from '@/lib/cache';
import type { RateLimitResult } from './postgres';

const SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local windowStart = now - windowMs

-- Remove entries outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count current requests in window
local count = redis.call('ZCARD', key)

if count < limit then
  -- Score = timestamp, member = timestamp + random suffix to allow duplicates
  local member = tostring(now) .. ':' .. redis.call('INCR', key .. ':seq')
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs)
  redis.call('PEXPIRE', key .. ':seq', windowMs)
  return {1, limit - count - 1, now + windowMs}
else
  -- Return the oldest entry's timestamp as reset time
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetAt = oldest[2] and (tonumber(oldest[2]) + windowMs) or (now + windowMs)
  return {0, 0, resetAt}
end
`;

export async function rateLimitRedis(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const result = (await redis.eval(
    SCRIPT,
    1,
    `rl:${key}`,
    String(now),
    String(windowMs),
    String(limit),
  )) as [number, number, number];

  return {
    allowed: result[0] === 1,
    remaining: result[1],
    resetAt: new Date(result[2]),
  };
}
```

### `lib/rate-limit/index.ts`

```ts
// lib/rate-limit/index.ts
// Unified rate limit interface. Uses Redis if REDIS_URL is set, else Postgres.

import type { RateLimitResult } from './postgres';

export type { RateLimitResult };

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (process.env.REDIS_URL) {
    const { rateLimitRedis } = await import('./redis');
    return rateLimitRedis(key, limit, windowMs);
  }
  const { rateLimitPostgres } = await import('./postgres');
  return rateLimitPostgres(key, limit, windowMs);
}

// Convenience helpers for common patterns
export async function rateLimitByIp(
  ip: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return rateLimit(`ip:${ip}`, limit, windowMs);
}

export async function rateLimitByUser(
  userId: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return rateLimit(`user:${userId}`, limit, windowMs);
}
```

### Middleware pattern

```ts
// middleware.ts
// Rate limit the /api/ai-call route at 30 req/min per IP.
// Combine with auth protection from recipe 02.

import { NextRequest, NextResponse } from 'next/server';

// IMPORTANT: Do not import Postgres or Redis here — middleware runs on the edge.
// Move rate limiting to the route handler itself, or use a lightweight
// edge-compatible KV store (e.g., Vercel KV, Cloudflare KV) for edge middleware.
// For Node runtime, put rateLimit() at the top of the route handler:

// Example: app/preview/api/ai-call/route.ts
// import { rateLimit } from '@/lib/rate-limit';
// const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
// const { allowed, remaining } = await rateLimit(`ai:${ip}`, 30, 60_000);
// if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

export function middleware(req: NextRequest) {
  // Add x-request-id
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Route handler usage

```ts
// app/preview/api/ai-call/route.ts — full example
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/auth/current-user';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';

  // Per-user limit if authenticated, per-IP if not
  const rateLimitKey = user ? `user:${user.id}` : `ip:${ip}`;
  const { allowed, remaining, resetAt } = await rateLimit(rateLimitKey, 30, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again after ' + resetAt.toISOString() },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(resetAt.getTime() / 1000)),
          'Retry-After': String(Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
        },
      },
    );
  }

  // Proceed with the actual work...
  return NextResponse.json({ ok: true });
}
```

## Commands to run

```bash
# No new deps needed for Postgres-backed rate limiting
# (uses pg pool from recipe 01)

# For Redis-backed rate limiting:
bun add -E ioredis  # if not already added from recipe 04
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add rate limiting', 'prevent abuse', 'throttle API calls', 'limit signups': follow `docs/stack/10-rate-limiting.md`. Use `lib/rate-limit/index.ts` auto-selects Postgres or Redis based on env. Add `rateLimit(key, limit, windowMs)` at the top of the relevant route handler. Never put rate limiting in Next.js middleware (edge runtime incompatibility)."

## Common pitfalls

- **Middleware is edge-runtime**: Next.js middleware runs on the edge runtime by default, which does not support Node.js built-ins (Postgres client, ioredis). Do NOT call `rateLimit()` from `middleware.ts`. Call it from the route handler (Node runtime).
- **`UNLOGGED TABLE` data loss**: On Postgres restart, the rate limit counters reset to zero. This means a brief window of unrestricted access post-restart. For auth rate limits on login, this is acceptable. For strict financial limits, use the Redis implementation.
- **Sliding window accuracy**: The Postgres sliding window implementation uses time buckets, not true per-request timestamps. It's accurate to within one bucket width. For most rate limiting, this is fine.
- **Clock skew in Redis**: The Redis Lua script uses `TIME` (server time) implicitly via `now` passed from the client. If client and Redis clock skew significantly, the window boundaries may drift. Use `redis.call('TIME')` in the Lua script for strict server-side time.
- **IP spoofing**: `X-Forwarded-For` can be spoofed. In production, configure your reverse proxy (Caddy, nginx) to set `X-Real-IP` and only trust that header.

## Further reading

- OWASP rate limiting: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
- Postgres UNLOGGED tables: https://www.postgresql.org/docs/16/sql-createtable.html#SQL-CREATETABLE-UNLOGGED
- Redis rate limiting patterns: https://redis.io/glossary/rate-limiting/
