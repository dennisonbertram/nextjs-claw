# 13 — Testing (Vitest + Playwright)

## What this gives you

Unit/integration tests with Vitest and end-to-end tests with Playwright. Database tests run in transactions that roll back after each test — no test data leaks, no database cleanup code needed. Includes a GitHub Actions CI example.

## When to reach for it / when not to

- **Unit tests**: Pure functions, validation schemas, utility helpers. Fast, no DB needed.
- **Integration tests**: API routes, server actions, auth flows. Use the transaction rollback pattern to get a clean DB state per test.
- **E2E tests**: Critical user journeys (signup, login, purchase). Run against a real running app.
- **Skip**: Testing `console.log` calls, trivial one-liner functions, or framework internals.

## Decision rationale

**Vitest over Jest**: Vitest uses Vite's transform pipeline, which supports TypeScript natively without Babel config. It's 2–5x faster than Jest for most TS codebases. The API is Jest-compatible, so migration is trivial.

**Playwright over Cypress**: Playwright supports all major browsers, runs in CI without display servers, and has first-class async/await. Its auto-waiting reduces flaky tests. Cypress is fine for simple apps but has limitations with multiple tabs, iframes (relevant here!), and cross-origin flows.

**Transaction rollback pattern**: Each integration test wraps in a Postgres transaction (`BEGIN`) that rolls back after the test (`ROLLBACK`). This avoids the cost of `TRUNCATE`-ing tables between tests and ensures tests are isolated without maintaining cleanup code. The pattern:

1. `beforeEach`: `BEGIN`
2. Run the test using the same `pg.Client` as the transaction
3. `afterEach`: `ROLLBACK`

This requires passing the transaction client to your db layer — the `withTx` pattern from recipe 01 supports this.

## Files the agent creates

- `vitest.config.ts` — Vitest configuration
- `vitest.setup.ts` — global test setup (DB connection)
- `tests/unit/` — unit tests
- `tests/integration/` — integration tests
- `tests/e2e/` — Playwright tests
- `playwright.config.ts` — Playwright configuration
- `.github/workflows/test.yml` — CI configuration

## Code

### `vitest.config.ts`

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        'drizzle/**',
        '**/*.config.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

### `vitest.setup.ts`

```ts
// vitest.setup.ts
import { beforeAll, afterAll } from 'vitest';

// Ensure DATABASE_URL is set for integration tests
beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    // Use a dedicated test database — never run tests against production
    process.env.DATABASE_URL = 'postgresql://app:app@localhost:5432/app_test';
  }
});

afterAll(async () => {
  // Close the pg pool after all tests
  const { pool } = await import('./lib/db');
  await pool.end();
});
```

### Transaction rollback test helper

```ts
// tests/helpers/db.ts
// Wraps each test in a Postgres transaction that rolls back after the test.
// This gives you a clean DB state without truncating or seeding between tests.

import { beforeEach, afterEach } from 'vitest';
import { pool } from '@/lib/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/lib/db/schema';
import type { Client } from 'pg';

// The transaction client shared within a test
let txClient: Client | null = null;

export function useTransactionalDB() {
  beforeEach(async () => {
    txClient = (await pool.connect()) as unknown as Client;
    await (txClient as unknown as { query: (s: string) => Promise<void> }).query('BEGIN');
  });

  afterEach(async () => {
    if (txClient) {
      await (txClient as unknown as { query: (s: string) => Promise<void> }).query('ROLLBACK');
      (txClient as unknown as { release: () => void }).release();
      txClient = null;
    }
  });

  // Returns a Drizzle client bound to the current transaction
  function getTxDb() {
    if (!txClient) throw new Error('No transaction client — call useTransactionalDB() first');
    return drizzle(txClient as unknown as Parameters<typeof drizzle>[0], { schema });
  }

  return { getTxDb };
}
```

### Unit test example

```ts
// tests/unit/validation.test.ts
import { describe, it, expect } from 'vitest';
import { safeParse } from '@/lib/validation';
import { signupSchema } from '@/lib/validation/schemas/auth';

describe('safeParse', () => {
  it('returns ok:true for valid input', () => {
    const result = safeParse(signupSchema, {
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.email).toBe('user@example.com');
  });

  it('returns errors for mismatched passwords', () => {
    const result = safeParse(signupSchema, {
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'different',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.confirmPassword).toBeDefined();
  });

  it('returns errors for invalid email', () => {
    const result = safeParse(signupSchema, {
      email: 'not-an-email',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBeDefined();
  });
});
```

### Integration test example

```ts
// tests/integration/auth.test.ts
import { describe, it, expect } from 'vitest';
import { useTransactionalDB } from '../helpers/db';
import { hashPassword, verifyPassword } from '@/lib/auth/hash';
import { users } from '@/lib/db/schema';

describe('auth', () => {
  const { getTxDb } = useTransactionalDB();

  it('hashes and verifies passwords correctly', async () => {
    const hash = await hashPassword('my-secret-password');
    expect(await verifyPassword(hash, 'my-secret-password')).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('inserts a user and retrieves it', async () => {
    const db = getTxDb();
    const hash = await hashPassword('test-pass');
    const [user] = await db
      .insert(users)
      .values({ email: 'test@example.com', passwordHash: hash })
      .returning();

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
    // Row is rolled back after this test — no cleanup needed
  });
});
```

### `playwright.config.ts`

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E test example

```ts
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Signup and Login', () => {
  test('user can sign up and is redirected', async ({ page }) => {
    await page.goto('/preview/signup');
    await page.fill('[name="email"]', `test+${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'TestPassword123');
    await page.fill('[name="confirmPassword"]', 'TestPassword123');
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/verify/);
  });

  test('login fails with wrong password', async ({ page }) => {
    await page.goto('/preview/login');
    await page.fill('[name="email"]', 'nonexistent@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });
});
```

### `.github/workflows/test.yml`

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: app
          POSTGRES_DB: app_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install deps
        run: bun install
        working-directory: template

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://app:app@localhost:5432/app_test
        run: bun db:migrate
        working-directory: template

      - name: Run unit/integration tests
        env:
          DATABASE_URL: postgresql://app:app@localhost:5432/app_test
          SESSION_SECRET: test-secret-32-bytes-minimum-ok
        run: bun vitest run
        working-directory: template

  e2e:
    runs-on: ubuntu-latest
    needs: unit-integration
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: app
          POSTGRES_PASSWORD: app
          POSTGRES_DB: app
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
        working-directory: template
      - run: bunx playwright install --with-deps chromium
        working-directory: template
      - name: Run E2E tests
        env:
          DATABASE_URL: postgresql://app:app@localhost:5432/app
          SESSION_SECRET: test-secret-32-bytes-minimum-ok
          SMTP_URL: smtp://localhost:1025
        run: bun playwright test
        working-directory: template
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: template/playwright-report/
```

## Commands to run

```bash
bun add -E vitest @vitest/coverage-v8 --dev
bun add -E @playwright/test --dev
bunx playwright install chromium

# Run unit/integration tests
bun vitest run

# Run with watch mode in dev
bun vitest

# Run E2E tests (app must be running)
bun playwright test
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add tests', 'set up testing', 'write a test for X': follow `docs/stack/13-testing.md`. Run `bun add -E vitest @vitest/coverage-v8 --dev`. Create `vitest.config.ts`. Use the transaction rollback pattern for any test that touches the database."

## Common pitfalls

- **Test DB isolation**: Always use `DATABASE_URL` pointing to a separate test database (`app_test`). Never run integration tests against production.
- **Pool cleanup**: The `vitest.setup.ts` calls `pool.end()` in `afterAll`. Without this, Vitest hangs after tests complete because the pg connection pool keeps the process alive.
- **`useTransactionalDB` and async**: The `beforeEach`/`afterEach` callbacks must be `async`. Vitest handles this correctly, but make sure not to accidentally drop `await`.
- **Playwright and iframes**: Testing inside the `/preview` iframe requires Playwright's `frameLocator`. Use `page.frameLocator('iframe[title="App preview"]').locator(...)` to target elements inside the iframe.
- **Coverage of Server Actions**: Vitest can test Server Actions by calling them directly (they're just async functions). No special setup needed.
- **Secrets in CI**: Never commit `SESSION_SECRET` or real credentials. Use GitHub Actions secrets for env vars. The values in the YAML above are test-only fakes.

## Further reading

- Vitest docs (context7 query: `vitest`)
- Playwright docs (context7 query: `playwright`)
- PostgreSQL transaction isolation: https://www.postgresql.org/docs/16/transaction-iso.html
