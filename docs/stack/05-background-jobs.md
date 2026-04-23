# 05 — Background Jobs (pg-boss)

## What this gives you

A persistent job queue backed by the Postgres database you already have — no separate queue service required. `pg-boss` uses Postgres tables for job storage, supports retries with exponential backoff, delays, cron scheduling, and singleton jobs. The worker is a long-running Node process separate from the Next.js web server.

## When to reach for it / when not to

- **Use** for anything that should not block an HTTP response: sending emails, processing uploads, charging subscriptions, generating PDFs, syncing third-party data.
- **Use** for cron jobs: daily cleanup, weekly digests, scheduled reports.
- **Skip** for work that must complete synchronously in the request (render a UI response, return a computed value).
- **Alternatives**: BullMQ (Redis-backed, more features but needs Redis), Inngest (SaaS), Trigger.dev (self-hostable but complex). For simple use cases, `pg-boss` on your existing Postgres is the right choice.

## Decision rationale

**pg-boss over BullMQ**: You already have Postgres (recipe 01). Adding Redis just for queues doubles your infrastructure complexity. `pg-boss` uses Postgres row locking (`SELECT ... FOR UPDATE SKIP LOCKED`) — the same reliable mechanism used by every mature queue in other ecosystems (Sidekiq, Good Job, Que). The trade-off is Postgres I/O under high job throughput; for most apps this is never the bottleneck.

## Critical: Next.js serverless incompatibility

The `pg-boss` worker is a **long-running process**. It must NOT run inside a Next.js route handler or server action — those are request-scoped and terminate after the response. The worker must be a separate Node process:

```
# In dev: run in a second terminal
node --loader tsx worker.ts

# In prod: run as a separate container/process (see recipe 14)
```

Do not attempt to start pg-boss inside `next.config.ts` or a route module. It will silently restart on hot reload and create ghost jobs.

## Files the agent creates

- `lib/jobs/index.ts` — pg-boss singleton and job registration
- `lib/jobs/jobs.ts` — typed job definitions
- `worker.ts` — the long-running worker entry point
- `lib/jobs/handlers/send-email.ts` — example: email job handler

## Code

### `lib/jobs/jobs.ts`

Define all job types here as a discriminated union. This gives type safety at enqueue and handler sites.

```ts
// lib/jobs/jobs.ts

export interface SendVerificationEmailJob {
  name: 'send-verification-email';
  data: {
    email: string;
    token: string;
  };
}

export interface SendPasswordResetEmailJob {
  name: 'send-password-reset-email';
  data: {
    email: string;
    token: string;
  };
}

export interface PruneExpiredSessionsJob {
  name: 'prune-expired-sessions';
  data: Record<string, never>;
}

export type AnyJob =
  | SendVerificationEmailJob
  | SendPasswordResetEmailJob
  | PruneExpiredSessionsJob;

export type JobName = AnyJob['name'];
export type JobData<N extends JobName> = Extract<AnyJob, { name: N }>['data'];
```

### `lib/jobs/index.ts`

```ts
// lib/jobs/index.ts
import PgBoss from 'pg-boss';
import type { JobName, JobData } from './jobs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Singleton — the web server only needs boss for enqueuing, not for working.
// Do NOT call boss.start() from within Next.js. Call it only from worker.ts.
declare global {
  // eslint-disable-next-line no-var
  var __pgBoss: PgBoss | undefined;
}

function createBoss(): PgBoss {
  return new PgBoss({
    connectionString: DATABASE_URL,
    // Retain completed jobs for 3 days for debugging
    deleteAfterDays: 3,
    // Archive failed jobs for 7 days
    archiveFailedAfterDays: 7,
  });
}

export const boss: PgBoss =
  process.env.NODE_ENV === 'production'
    ? createBoss()
    : (global.__pgBoss ??= createBoss());

// Enqueue a job from anywhere (API routes, server actions, etc.)
// boss does NOT need to be started to enqueue — it uses its own db connection.
export async function enqueue<N extends JobName>(
  name: N,
  data: JobData<N>,
  options?: PgBoss.SendOptions,
): Promise<string | null> {
  return boss.send(name, data as object, options ?? {});
}

// Enqueue with deduplication (singleton jobs — only one in queue at a time)
export async function enqueueSingleton<N extends JobName>(
  name: N,
  data: JobData<N>,
  options?: PgBoss.SendOptions,
): Promise<string | null> {
  return boss.sendOnce(name, data as object, options ?? {});
}

// Schedule a recurring cron job (safe to call multiple times — idempotent)
export async function scheduleCron<N extends JobName>(
  name: N,
  cron: string,
  data: JobData<N>,
): Promise<void> {
  await boss.schedule(name, cron, data as object);
}
```

### `lib/jobs/handlers/send-email.ts`

```ts
// lib/jobs/handlers/send-email.ts
import type PgBoss from 'pg-boss';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';

export async function handleSendVerificationEmail(
  job: PgBoss.Job<{ email: string; token: string }>,
): Promise<void> {
  const { email, token } = job.data;
  await sendVerificationEmail(email, token);
}

export async function handleSendPasswordResetEmail(
  job: PgBoss.Job<{ email: string; token: string }>,
): Promise<void> {
  const { email, token } = job.data;
  await sendPasswordResetEmail(email, token);
}

export async function handlePruneExpiredSessions(): Promise<void> {
  const { pruneExpiredSessions } = await import('@/lib/auth/session');
  await pruneExpiredSessions();
}
```

### `worker.ts`

```ts
// worker.ts — run as: node --loader tsx worker.ts
// This is a long-running process. Keep it running in prod alongside Next.js.
// In dev: `bun worker.ts` in a separate terminal.

import PgBoss from 'pg-boss';
import {
  handleSendVerificationEmail,
  handleSendPasswordResetEmail,
  handlePruneExpiredSessions,
} from './lib/jobs/handlers/send-email';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[worker] DATABASE_URL is not set');
  process.exit(1);
}

const boss = new PgBoss({
  connectionString: DATABASE_URL,
  deleteAfterDays: 3,
  archiveFailedAfterDays: 7,
});

boss.on('error', (err: Error) => {
  console.error('[pg-boss] error:', err);
});

async function start() {
  await boss.start();
  console.log('[worker] pg-boss started');

  // Register handlers
  await boss.work('send-verification-email', { teamSize: 5, teamConcurrency: 5 }, handleSendVerificationEmail);
  await boss.work('send-password-reset-email', { teamSize: 5, teamConcurrency: 5 }, handleSendPasswordResetEmail);
  await boss.work('prune-expired-sessions', { teamSize: 1, teamConcurrency: 1 }, handlePruneExpiredSessions);

  // Schedule recurring cron jobs
  // Prune expired sessions daily at midnight
  await boss.schedule('prune-expired-sessions', '0 0 * * *', {});

  console.log('[worker] Handlers registered. Waiting for jobs...');
}

async function shutdown() {
  console.log('[worker] Stopping...');
  await boss.stop({ graceful: true, timeout: 30_000 });
  console.log('[worker] Stopped.');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  console.error('[worker] Fatal error:', err);
  process.exit(1);
});
```

### Usage from an API route

```ts
// app/preview/auth/signup/route.ts — enqueue instead of inline send
import { enqueue } from '@/lib/jobs';

// Instead of: await sendVerificationEmail(email, token);
await enqueue('send-verification-email', { email, token });
```

## Commands to run

```bash
bun add -E pg-boss
bun add -E @types/pg-boss --dev  # pg-boss ships its own types; may not be needed

# Run the worker in a separate terminal during dev:
bun worker.ts

# Or add to package.json:
# "worker": "node --loader tsx worker.ts"
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "worker": "node --loader tsx worker.ts"
  }
}
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add background jobs', 'send emails in the background', 'schedule tasks', 'add a cron job': follow `docs/stack/05-background-jobs.md`. Run `bun add -E pg-boss`. Create `lib/jobs/index.ts`, `lib/jobs/jobs.ts`, and `worker.ts`. Start the worker in a separate terminal with `bun worker.ts`. NEVER start pg-boss inside a Next.js route handler."

## Common pitfalls

- **Never call `boss.start()` from Next.js**: Calling `boss.start()` inside a route handler or `next.config.ts` causes the boss to start and stop on every hot reload, corrupting job state.
- **Enqueuing does not require `boss.start()`**: The `boss.send()` / `boss.sendOnce()` calls write to Postgres directly via the connection string — the boss does not need to be "started" for enqueueing.
- **pg-boss schema**: On first `boss.start()`, pg-boss creates its own schema (`pgboss`) in your Postgres database. This is safe. It does not interfere with your `public` schema tables.
- **Job data must be JSON-serializable**: No `Date` objects, no circular refs, no class instances. Convert dates to ISO strings.
- **Retry backoff**: Default is exponential backoff. Configure with `expireInHours`, `retryBackoff: true`, `retryLimit` in the send options.
- **`teamSize` vs `teamConcurrency`**: `teamSize` is the max parallel workers fetching from a job type. `teamConcurrency` is the max concurrent executions per fetch. For I/O-bound jobs (email), both can be 5+. For CPU-bound, keep them at 1–2.

## Further reading

- `pg-boss` docs (context7 query: `pg-boss`)
- pg-boss GitHub: https://github.com/timgit/pg-boss
