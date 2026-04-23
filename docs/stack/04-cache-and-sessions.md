# 04 — Cache and Sessions (Redis via ioredis)

## What this gives you

A Redis-backed cache layer using `ioredis`. Covers: get/set with TTL, tag-based cache invalidation, idempotency keys for API operations, and a sliding-window rate limiter implemented as an atomic Lua script. Also documents when to skip Redis and use Postgres `UNLOGGED` tables instead.

## When to reach for it / when not to

- **Use Redis** for high-read shared cache (rendered fragments, expensive DB query results), idempotency key deduplication across multiple servers, rate limiting that must be sub-millisecond accurate.
- **Use Postgres `UNLOGGED` tables** (see recipe 10) for rate limiting when you already have Postgres and don't need Redis. UNLOGGED tables are 3–5x faster than logged tables but data is lost on crash — acceptable for rate limit counters.
- **Skip Redis entirely** if your app is single-server and read volume is low. A Postgres query cache and in-memory LRU (Node `Map` with TTL) is often sufficient.
- **Do not use Redis for sessions in this stack**: Sessions live in Postgres (recipe 02). Redis sessions are faster but add complexity; Postgres sessions are transactional and simpler to reason about.

## Decision rationale

**ioredis over `redis` (the official client)**: Both are fine as of April 2026. `ioredis` has a slightly richer API (Lua scripting, cluster, pipeline) and has been the ecosystem standard longer. The official `redis` package (formerly `node-redis`) is also acceptable. The patterns below work with minor adaptation on either.

## Files the agent creates

- `lib/cache/index.ts` — ioredis singleton + get/set/del/tag helpers
- `lib/cache/idempotency.ts` — idempotency key store

## Code

### `lib/cache/index.ts`

```ts
// lib/cache/index.ts
import Redis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

function createClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('error', (err: Error) => {
    console.error('[Redis] error:', err.message);
  });

  return client;
}

export const redis: Redis =
  process.env.NODE_ENV === 'production'
    ? createClient()
    : (global.__redisClient ??= createClient());

// ── Simple key/value cache ─────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

// ── Tag-based invalidation ─────────────────────────────────────────────────
// Tag → set of keys. When tag is invalidated, all tagged keys are deleted.
// Usage:
//   await cacheSetTagged('user:42:profile', data, 300, ['user:42', 'users']);
//   await cacheInvalidateTag('user:42'); // deletes user:42:profile

const TAG_PREFIX = 'tag:';

export async function cacheSetTagged<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  tags: string[],
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  for (const tag of tags) {
    pipeline.sadd(`${TAG_PREFIX}${tag}`, key);
    pipeline.expire(`${TAG_PREFIX}${tag}`, ttlSeconds + 60); // slightly longer TTL
  }
  await pipeline.exec();
}

export async function cacheInvalidateTag(tag: string): Promise<void> {
  const tagKey = `${TAG_PREFIX}${tag}`;
  const keys = await redis.smembers(tagKey);
  if (keys.length > 0) {
    const pipeline = redis.pipeline();
    for (const k of keys) pipeline.del(k);
    pipeline.del(tagKey);
    await pipeline.exec();
  }
}

// ── Sliding window rate limiter (Lua atomic script) ──────────────────────

const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local windowStart = now - window

-- Remove entries outside the window
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count current entries
local count = redis.call('ZCARD', key)

if count < limit then
  -- Add current request
  redis.call('ZADD', key, now, now .. '-' .. math.random(1, 1000000))
  redis.call('EXPIRE', key, math.ceil(window / 1000))
  return {1, limit - count - 1}
else
  return {0, 0}
end
`;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function rateLimitRedis(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const result = await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    `rl:${key}`,
    String(now),
    String(windowMs),
    String(limit),
  ) as [number, number];

  return {
    allowed: result[0] === 1,
    remaining: result[1],
  };
}
```

### `lib/cache/idempotency.ts`

```ts
// lib/cache/idempotency.ts
// Redis-backed idempotency keys. Use for API operations that must not be
// duplicated even if the client retries (payments, sends, etc.).
// Keys expire after the specified TTL (default: 24 hours).

import { redis } from './index';

const IDEMPOTENCY_PREFIX = 'idempotency:';

export async function checkIdempotencyKey(
  key: string,
  ttlSeconds = 86400,
): Promise<{ isDuplicate: boolean; cachedResult?: unknown }> {
  const stored = await redis.get(`${IDEMPOTENCY_PREFIX}${key}`);
  if (stored !== null) {
    return { isDuplicate: true, cachedResult: JSON.parse(stored) };
  }
  return { isDuplicate: false };
}

export async function storeIdempotencyResult(
  key: string,
  result: unknown,
  ttlSeconds = 86400,
): Promise<void> {
  await redis.set(
    `${IDEMPOTENCY_PREFIX}${key}`,
    JSON.stringify(result),
    'EX',
    ttlSeconds,
  );
}

// Usage example in an API route:
//
// const idemKey = req.headers.get('idempotency-key');
// if (idemKey) {
//   const { isDuplicate, cachedResult } = await checkIdempotencyKey(idemKey);
//   if (isDuplicate) return NextResponse.json(cachedResult);
// }
// const result = await performOperation();
// if (idemKey) await storeIdempotencyResult(idemKey, result);
// return NextResponse.json(result);
```

## Commands to run

```bash
bun add -E ioredis
bun add -E @types/ioredis --dev   # usually not needed, ioredis ships its own types
```

Start Redis (from docker-compose.dev.yml — see recipe 00):
```bash
docker compose -f docker-compose.dev.yml up redis -d
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add caching', 'cache expensive queries', 'add rate limiting with Redis', 'prevent duplicate API calls': follow `docs/stack/04-cache-and-sessions.md`. Run `bun add -E ioredis`. Create `lib/cache/index.ts`. Start Redis from docker-compose.dev.yml."

## Common pitfalls

- **ioredis singleton**: Same HMR pool-leak issue as Postgres. Use `global.__redisClient` guard in dev.
- **Tag invalidation is eventually consistent at scale**: If two requests simultaneously set the same key and invalidate it, one stale version might survive briefly. For strict consistency, use transactions or accept the eventual model.
- **Lua script atomicity**: The rate limiter Lua script is atomic within a single Redis node. In Redis Cluster, all keys accessed by a Lua script must hash to the same slot — use hash tags if needed: `{user:42}:rl`.
- **`UNLOGGED` tables as Redis alternative**: For rate limiting only (no caching), a Postgres `UNLOGGED` table (see recipe 10) avoids a Redis dependency entirely. Pick Redis only when you actually need the speed or the cache patterns.
- **Connection errors in dev**: If Redis is not running, `ioredis` retries indefinitely and logs errors. Set `retryStrategy: () => null` in the client config to fail fast during local development if Redis is optional.

## Further reading

- `ioredis` docs (context7 query: `ioredis`)
- Redis commands reference: https://redis.io/commands
- Tag-based cache invalidation patterns: https://www.blog.redislabs.com/
