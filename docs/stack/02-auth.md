# 02 — Auth (Home-grown sessions, passwords, OAuth)

## What this gives you

Complete user authentication without any external auth service. Covers: signup with email verification, login with rate-limiting, logout, password reset, server-side sessions stored in Postgres, CSRF protection, and OAuth (Google + GitHub) via raw `fetch` with PKCE.

## When to reach for it / when not to

- **Use** for any app that needs accounts.
- **Use** when you want full control over the session lifecycle and user schema.
- **Skip** if the project only needs API key auth or has no user concept at all.
- **Alternatives mentioned but not default**: Lucia Auth (good abstraction over the same primitives), Auth.js (opinionated, many adapters, but hides the internals).

## Decision rationale

**No Auth0/Clerk/Supabase Auth**: These add monthly cost, rate limits, and a vendor dependency for the most critical path in your app. Rolling your own with `argon2id` + server-side sessions is ~200 lines and runs on the Postgres you already have.

**argon2id via `@node-rs/argon2`**: This is the recommended algorithm (OWASP 2024, RFC 9106). The `@node-rs/argon2` package is a native Rust binding — fast, no JS crypto fallback. If native builds are unavailable (rare), fall back to `crypto.scryptSync` from Node stdlib (documented in the pitfalls section).

**Server-side sessions over JWTs**: JWTs cannot be invalidated without a revocation list (which is just a session store). Server-side sessions let you log out a user instantly. The session token in the cookie is an HMAC-signed opaque value — the server never trusts the raw value, it verifies the signature first.

## Files the agent creates

- `lib/auth/hash.ts` — password hashing and verification
- `lib/auth/session.ts` — create, read, refresh, and destroy sessions
- `lib/auth/csrf.ts` — double-submit cookie CSRF protection
- `lib/auth/rate-limit.ts` — per-IP login rate limiter (Postgres-backed)
- `lib/auth/oauth.ts` — Google + GitHub OAuth via fetch + PKCE
- `lib/auth/current-user.ts` — `getCurrentUser()` helper for Server Components
- `app/preview/auth/signup/route.ts` — signup API
- `app/preview/auth/login/route.ts` — login API
- `app/preview/auth/logout/route.ts` — logout API
- `app/preview/auth/verify-email/route.ts` — email verification callback
- `app/preview/auth/forgot-password/route.ts` — password reset request
- `app/preview/auth/reset-password/route.ts` — password reset confirm
- `app/preview/auth/oauth/[provider]/route.ts` — OAuth initiation
- `app/preview/auth/oauth/[provider]/callback/route.ts` — OAuth callback
- `middleware.ts` — route protection

## Code

### `lib/auth/hash.ts`

```ts
// lib/auth/hash.ts
// argon2id via @node-rs/argon2 (Rust native — fast, no JS fallback needed).
// If native build fails at install time, see scrypt fallback in pitfalls section.

import { hash, verify } from '@node-rs/argon2';

// OWASP 2024 minimum parameters for argon2id
const ARGON2_OPTIONS = {
  memoryCost: 65536,   // 64 MiB
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}
```

### `lib/auth/session.ts`

```ts
// lib/auth/session.ts
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq, lt } from 'drizzle-orm';
import type { Session, User } from '@/lib/db/schema';

const COOKIE_NAME = 'session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // refresh if < 7 days left

function getSecret(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return Buffer.from(secret, 'utf8');
}

function sign(token: string): string {
  const mac = createHmac('sha256', getSecret()).update(token).digest('base64url');
  return `${token}.${mac}`;
}

function unsign(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.');
  if (lastDot === -1) return null;
  const token = signed.slice(0, lastDot);
  const expected = sign(token);
  try {
    if (timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return token;
  } catch {
    return null;
  }
  return null;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({ id: token, userId, expiresAt });

  const signed = sign(token);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<(Session & { userId: string }) | null> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(COOKIE_NAME)?.value;
  if (!signed) return null;

  const token = unsign(signed);
  if (!token) return null;

  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, token))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt < new Date()) {
    await destroySession();
    return null;
  }

  // Sliding expiry: refresh if past the threshold
  const timeLeft = row.expiresAt.getTime() - Date.now();
  if (timeLeft < REFRESH_THRESHOLD_MS) {
    const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
    await db
      .update(sessions)
      .set({ expiresAt: newExpiry, freshAt: new Date() })
      .where(eq(sessions.id, token));
  }

  return row;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(COOKIE_NAME)?.value;
  if (signed) {
    const token = unsign(signed);
    if (token) {
      await db.delete(sessions).where(eq(sessions.id, token));
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// Periodic cleanup — call from a cron job (recipe 05) or on each login
export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
```

### `lib/auth/csrf.ts`

```ts
// lib/auth/csrf.ts
// Double-submit cookie pattern.
// 1. On any GET to a page with a form, generate a random token and set it
//    in a non-HttpOnly cookie (JS-readable) AND embed it in the form as a hidden field.
// 2. On POST, verify the header/body value matches the cookie value.
// Since an attacker on a different origin cannot read your cookies (SameSite=Lax
// already blocks most CSRF), this is belt-and-braces for same-site or older browsers.

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const CSRF_COOKIE = 'csrf';

export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(24).toString('base64url');
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false,   // must be JS-readable so the form can embed it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });
  return token;
}

export async function validateCsrfToken(req: NextRequest): Promise<boolean> {
  // Accept token from X-CSRF-Token header OR form body field _csrf
  const headerToken = req.headers.get('x-csrf-token');
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken) return false;
  // Constant-time compare
  try {
    const a = Buffer.from(headerToken);
    const b = Buffer.from(cookieToken);
    return a.length === b.length && require('node:crypto').timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
```

### `lib/auth/rate-limit.ts`

```ts
// lib/auth/rate-limit.ts
// Postgres-backed sliding window rate limiter.
// No Redis required. Uses UNLOGGED table for speed (data loss on crash is acceptable).

import { pool } from '@/lib/db';

// Run once at startup (or in a migration) to create the table
export async function ensureRateLimitTable(): Promise<void> {
  await pool.query(`
    CREATE UNLOGGED TABLE IF NOT EXISTS rate_limit_buckets (
      key        TEXT NOT NULL,
      window_end TIMESTAMPTZ NOT NULL,
      count      INT NOT NULL DEFAULT 0,
      PRIMARY KEY (key, window_end)
    );
    CREATE INDEX IF NOT EXISTS rl_window_end_idx ON rate_limit_buckets (window_end);
  `);
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Sliding window rate limit.
 * @param key    Identifies the subject (e.g., IP address or user ID)
 * @param limit  Max requests per window
 * @param windowMs  Window size in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowEnd = new Date(Math.ceil(now.getTime() / windowMs) * windowMs);
  const windowStart = new Date(windowEnd.getTime() - windowMs);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert the current window bucket
    const { rows } = await client.query<{ count: number }>(
      `INSERT INTO rate_limit_buckets (key, window_end, count)
       VALUES ($1, $2, 1)
       ON CONFLICT (key, window_end)
       DO UPDATE SET count = rate_limit_buckets.count + 1
       RETURNING count`,
      [key, windowEnd],
    );

    // Also count the previous partial window for sliding effect
    const { rows: prev } = await client.query<{ count: number }>(
      `SELECT COALESCE(SUM(count), 0) AS count
       FROM rate_limit_buckets
       WHERE key = $1 AND window_end > $2 AND window_end <= $3`,
      [key, windowStart, windowEnd],
    );

    await client.query('COMMIT');

    // Prune old buckets async (fire and forget)
    pool.query(
      `DELETE FROM rate_limit_buckets WHERE window_end < $1`,
      [new Date(now.getTime() - windowMs * 2)],
    ).catch(() => {});

    const total = Number(prev[0]?.count ?? 0);
    const current = Number(rows[0]?.count ?? 0);
    // Sliding window: weight = (prev * overlap%) + current
    const overlap = 1 - (now.getTime() % windowMs) / windowMs;
    const weighted = Math.floor(
      (total - current) * overlap + current,
    );

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

### `lib/auth/oauth.ts`

```ts
// lib/auth/oauth.ts
// OAuth 2.0 authorization code flow with PKCE, implemented with fetch.
// No oauth library. Supports Google and GitHub.

import { randomBytes, createHash } from 'node:crypto';

export type OAuthProvider = 'google' | 'github';

interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

function getConfig(provider: OAuthProvider): OAuthConfig {
  if (provider === 'google') {
    return {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scopes: ['openid', 'email', 'profile'],
    };
  }
  // GitHub
  return {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    scopes: ['read:user', 'user:email'],
  };
}

export interface OAuthState {
  verifier: string;   // PKCE code verifier (store in session/cookie)
  state: string;      // CSRF state param
}

export function generateOAuthState(): OAuthState {
  return {
    verifier: randomBytes(32).toString('base64url'),
    state: randomBytes(16).toString('base64url'),
  };
}

export function buildAuthUrl(
  provider: OAuthProvider,
  redirectUri: string,
  oauthState: OAuthState,
): string {
  const cfg = getConfig(provider);
  const challenge = createHash('sha256')
    .update(oauthState.verifier)
    .digest('base64url');

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: cfg.scopes.join(' '),
    state: oauthState.state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  // GitHub doesn't support PKCE — strip those params
  if (provider === 'github') {
    params.delete('code_challenge');
    params.delete('code_challenge_method');
  }

  return `${cfg.authUrl}?${params}`;
}

export interface OAuthUserInfo {
  providerId: string;
  email: string;
  name?: string;
}

export async function exchangeCodeForUser(
  provider: OAuthProvider,
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<OAuthUserInfo> {
  const cfg = getConfig(provider);

  // Exchange code for access token
  const tokenBody: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: redirectUri,
  };
  if (provider === 'google') tokenBody.code_verifier = verifier;

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(tokenBody),
  });
  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;

  // Fetch user info
  const userRes = await fetch(cfg.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(provider === 'github' ? { Accept: 'application/vnd.github+json' } : {}),
    },
  });
  if (!userRes.ok) throw new Error(`User info fetch failed: ${userRes.status}`);
  const userInfo = await userRes.json();

  if (provider === 'google') {
    return {
      providerId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    };
  }

  // GitHub: email may be null if private; fetch primary from /user/emails
  let email: string = userInfo.email;
  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    const emails: Array<{ email: string; primary: boolean; verified: boolean }> =
      await emailRes.json();
    const primary = emails.find((e) => e.primary && e.verified);
    if (!primary) throw new Error('No verified primary email on GitHub account');
    email = primary.email;
  }

  return {
    providerId: String(userInfo.id),
    email,
    name: userInfo.name ?? userInfo.login,
  };
}
```

### `lib/auth/current-user.ts`

```ts
// lib/auth/current-user.ts
// Call from Server Components to get the authenticated user.

import { getSession } from './session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@/lib/db/schema';

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ?? null;
}

// Throws a redirect if not authenticated — use in Server Components that require auth
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }
  return user;
}
```

### `app/preview/auth/signup/route.ts`

```ts
// app/preview/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, emailVerificationTokens } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/hash';
import { createSession } from '@/lib/auth/session';
import { sendVerificationEmail } from '@/lib/email';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase().trim(), passwordHash })
    .returning();

  // Create email verification token (expires in 24h)
  const token = randomBytes(32).toString('base64url');
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await sendVerificationEmail(email, token);
  await createSession(user.id);

  return NextResponse.json({ ok: true });
}
```

### `app/preview/auth/login/route.ts`

```ts
// app/preview/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/hash';
import { createSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/auth/rate-limit';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
  const { allowed } = await rateLimit(`login:${ip}`, 10, 15 * 60 * 1000); // 10/15min

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429 },
    );
  }

  const { email, password } = (await req.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  // Constant-time: always hash even if user not found (prevents timing attacks)
  const validPassword =
    user?.passwordHash != null
      ? await verifyPassword(user.passwordHash, password)
      : false;

  if (!user || !validPassword) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
```

### `app/preview/auth/logout/route.ts`

```ts
// app/preview/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
```

### `middleware.ts`

```ts
// middleware.ts — protect routes under /preview/dashboard (adjust pattern as needed)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Routes that require auth
const PROTECTED = ['/preview/dashboard', '/preview/settings', '/preview/account'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = req.cookies.get('session');
  if (!session?.value) {
    return NextResponse.redirect(new URL('/preview/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/preview/:path*'],
};
```

## Commands to run

```bash
bun add -E @node-rs/argon2 pg drizzle-orm
bun add -E @types/pg drizzle-kit --dev

# After schema changes, generate and apply migrations:
bun db:generate
bun db:migrate
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add login', 'add authentication', 'add signup', 'add user accounts': follow `docs/stack/02-auth.md`. First ensure recipe 01 (database) is set up. Then create the files in the Files section. Run `bun add -E @node-rs/argon2`. Run `bun db:generate && bun db:migrate`. Implement the login/signup UI under `app/preview/`."

## Common pitfalls

- **argon2 native build**: `@node-rs/argon2` compiles Rust at install time via `napi-rs`. On most platforms this works. If it fails, fall back to Node's built-in `crypto.scryptSync`:
  ```ts
  // Fallback: scrypt (slower but pure Node, no native deps)
  import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
  export function hashPasswordSync(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }
  export function verifyPasswordSync(stored: string, candidate: string): boolean {
    const [salt, hash] = stored.split(':');
    const candidateHash = scryptSync(candidate, salt, 64).toString('hex');
    return timingSafeEqual(Buffer.from(hash), Buffer.from(candidateHash));
  }
  ```
- **Cookie `secure` flag**: Must be `false` in local dev (http), `true` in production (https). The code checks `NODE_ENV === 'production'`.
- **Timing attacks on login**: Always call `verifyPassword` even when the user is not found. The code above does this.
- **OAuth PKCE**: GitHub does not support PKCE (as of April 2026). The code strips those params for GitHub.
- **Session expiry cleanup**: Call `pruneExpiredSessions()` from a cron job (recipe 05) daily. Otherwise expired rows accumulate in Postgres.
- **`SESSION_SECRET` rotation**: Changing the secret invalidates all existing sessions. Plan accordingly.
- **CSRF and Server Actions**: Next.js 16 Server Actions validate the `Origin` header automatically. For plain API routes, use the `validateCsrfToken` helper.

## Further reading

- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- RFC 9106 (argon2): https://www.rfc-editor.org/rfc/rfc9106
- `@node-rs/argon2` (context7 query: `@node-rs/argon2`)
- OAuth 2.0 PKCE: RFC 7636
