# 01 — Database (Postgres + Drizzle ORM)

## What this gives you

A type-safe SQL layer backed by self-hosted Postgres 16. Drizzle ORM generates plain TypeScript types from your schema, runs migrations as versioned SQL files (you read them, you own them), and does not require a generated client binary. Works cleanly in Next.js App Router without the bundling headaches that Prisma's engine brings.

## When to reach for it / when not to

- **Use** for any persistent data: users, sessions, content, orders.
- **Use** when you need transactions, foreign keys, or complex queries.
- **Skip** for purely ephemeral state (short-lived cache) — use Redis from recipe 04 there.
- **Skip** for large binary blobs — store in MinIO (recipe 06), save the URL in Postgres.

## Decision rationale

**Drizzle over Prisma**: Drizzle has no generated client binary, no WASM edge quirks, and its migrations are plain `.sql` files you can read and version. The query builder is 100% TypeScript with `z.infer<>`-compatible types. Prisma is fine but its generated client adds 20–50 MB to the build and requires `prisma generate` as a build step. For a self-hosted stack, Drizzle is lighter.

**`pg` driver over `postgres` (the Vercel package)**: `pg` is battle-tested, runs on bare Node, and supports both pooled (`Pool`) and single-connection (`Client`) modes. The `postgres` package (lowercase) is fine too — the API surface is very similar — but `pg` has more ecosystem tooling.

## Files the agent creates

- `lib/db/index.ts` — singleton pool + db client
- `lib/db/schema.ts` — Drizzle schema definitions
- `drizzle.config.ts` — drizzle-kit configuration
- `drizzle/migrations/` — versioned SQL migration files (auto-generated)
- `drizzle/seed.ts` — optional seed script

## Code

### `lib/db/index.ts`

```ts
// lib/db/index.ts
// Singleton Postgres pool + Drizzle client.
// Singleton guard prevents pool explosion during Next.js hot reload in dev.

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  return new Pool({
    connectionString: url,
    max: process.env.NODE_ENV === 'production' ? 20 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

// In dev, HMR re-executes this module on each reload. Without the global guard,
// each reload would open a new pool, exhausting Postgres connections quickly.
const pool: Pool =
  process.env.NODE_ENV === 'production'
    ? createPool()
    : (global.__pgPool ??= createPool());

export const db = drizzle(pool, { schema });

// For raw queries and transactions that need a dedicated client
export { pool };

// Helper: run a callback inside a serializable transaction.
// Usage: await withTx(async (tx) => { await tx.insert(...); });
export async function withTx<T>(
  fn: (tx: ReturnType<typeof drizzle>) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txDb = drizzle(client as unknown as Pool, { schema });
    const result = await fn(txDb);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### `lib/db/schema.ts`

Start with the base tables that auth (recipe 02) needs. Add your own tables below.

```ts
// lib/db/schema.ts
import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  index,
  uuid,
} from 'drizzle-orm/pg-core';

// ── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    passwordHash: text('password_hash'), // null for OAuth-only accounts
    emailVerified: boolean('email_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('users_email_idx').on(t.email)],
);

// ── Sessions ───────────────────────────────────────────────────────────────

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(), // random token stored in cookie
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    freshAt: timestamp('fresh_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
);

// ── Email verification tokens ──────────────────────────────────────────────

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (t) => [index('evt_token_idx').on(t.token)],
);

// ── Password reset tokens ──────────────────────────────────────────────────

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (t) => [index('prt_token_idx').on(t.token)],
);

// ── OAuth accounts ─────────────────────────────────────────────────────────

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 32 }).notNull(), // 'google' | 'github'
    providerAccountId: text('provider_account_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('oauth_provider_account_idx').on(t.provider, t.providerAccountId),
    index('oauth_user_id_idx').on(t.userId),
  ],
);

// ── Type exports ──────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
```

### `drizzle.config.ts`

```ts
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### `drizzle/seed.ts`

```ts
// drizzle/seed.ts — run with: bun drizzle/seed.ts
import { db, pool } from '../lib/db';
import { users } from '../lib/db/schema';

async function seed() {
  console.log('Seeding...');

  // Example: insert a dev user (no password hash — set via the signup flow)
  await db
    .insert(users)
    .values({
      email: 'dev@example.com',
      emailVerified: true,
    })
    .onConflictDoNothing();

  console.log('Done.');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

## Commands to run

```bash
# Install deps (exact versions — no ^ or ~)
bun add -E drizzle-orm pg
bun add -E drizzle-kit @types/pg --dev

# Generate a migration from your schema changes
bun drizzle-kit generate

# Apply pending migrations
bun drizzle-kit migrate

# Open Drizzle Studio (visual DB browser)
bun drizzle-kit studio

# Run seed
bun drizzle/seed.ts
```

Add these to `package.json` scripts:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "bun drizzle/seed.ts"
  }
}
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add a database', 'store data', or 'persist X': follow `docs/stack/01-database.md`. Create `lib/db/index.ts`, `lib/db/schema.ts`, and `drizzle.config.ts` from the code samples. Run `bun add -E drizzle-orm pg` and `bun add -E drizzle-kit @types/pg --dev`. Then run `bun db:generate && bun db:migrate`. Add the user's table to `lib/db/schema.ts`, regenerate, and migrate again."

## Common pitfalls

- **Hot reload pool leak**: The singleton `global.__pgPool` guard is mandatory. Without it, each file save in dev opens a new pool of 5 connections; after 10–20 saves you hit `too many clients`.
- **`DATABASE_URL` missing in production**: Always validate at startup. The code above throws immediately if the env var is absent.
- **Migrations vs. `push`**: `drizzle-kit push` syncs schema without generating migration files — convenient for early prototyping, dangerous in production. Switch to `drizzle-kit migrate` as soon as there's real data.
- **Timestamp without timezone**: Always use `{ withTimezone: true }` on timestamp columns. Timezone-naive timestamps interact badly with DST and serialization.
- **Transaction helper**: The `withTx` helper uses a dedicated `pg.Client` pulled from the pool. Do not call `db.query()` directly from a pool connection inside a transaction — use the `txDb` arg that `withTx` passes.
- **SSL in production**: Add `?sslmode=require` to `DATABASE_URL` when connecting to a remote Postgres. Omit in local Docker dev.

## Further reading

- Drizzle ORM docs (use context7 query: `drizzle-orm`) — schema, relations, migrations
- `pg` package: https://github.com/brianc/node-postgres
- `drizzle-kit` CLI: https://orm.drizzle.team/kit-docs/overview
