# 11 — Security Headers and CSRF

## What this gives you

A Next.js middleware that sets hardened HTTP security headers on every response, plus CSRF protection for mutating API routes using the double-submit cookie pattern, an origin check, and guidance on Content Security Policy configuration.

## When to reach for it / when not to

- **Always apply security headers**: There is no downside. Add this middleware to every project.
- **CSRF protection for API routes**: Required for any route that mutates state (POST, PUT, DELETE, PATCH) and is called from a browser form or fetch.
- **Skip CSRF for Server Actions**: Next.js 16 Server Actions validate the `Origin` and `Host` headers automatically. The custom CSRF check is for plain API routes.
- **Skip CSRF for API-key-authenticated endpoints**: CSRF only matters for cookie-authenticated sessions.

## Decision rationale

**Double-submit cookie over synchronizer token (CSRF token in hidden field)**: Both are valid. Double-submit is simpler to implement in a stateless way — no server-side state needed, just sign the token and verify on both cookie and header. For apps using server-side sessions (recipe 02), synchronizer tokens are fine too, but double-submit requires less plumbing.

**Origin check as belt-and-braces**: Verifying that the `Origin` header matches the expected domain catches most CSRF attempts before the double-submit check runs. It's cheap and adds defense-in-depth.

**No external library**: The implementation fits in ~50 lines. There is no well-maintained "csrf" npm package that adds more value than this code.

## Files the agent creates

- `middleware.ts` — Next.js middleware (security headers + CSRF validation)
- `lib/auth/csrf.ts` — double-submit cookie helpers (also in recipe 02)

## Code

### `middleware.ts`

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

// Mutating HTTP methods that require CSRF protection
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes that should be excluded from CSRF checks:
// - API routes called from other services (use API keys instead)
// - Webhook receivers (Stripe, GitHub — they use their own signatures)
const CSRF_EXEMPT = [
  '/preview/auth/oauth/',       // OAuth callbacks POST from external providers
  '/api/webhooks/',              // Webhook receivers
];

export function middleware(req: NextRequest) {
  const { pathname, origin: requestOrigin } = req.nextUrl;
  const method = req.method;

  // ── Security headers (applied to all responses) ──────────────────────────
  const res = NextResponse.next();

  res.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  // Adjust the 'connect-src' directive if you add external API calls from the browser.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",  // unsafe-inline needed for Next.js inline scripts
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${process.env.S3_ENDPOINT ?? ''}`,
    "frame-src 'self'",            // allows the /preview iframe
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join('; ');

  res.headers.set('Content-Security-Policy', csp);

  // Request ID (also useful for log correlation — recipe 09)
  const requestId =
    req.headers.get('x-request-id') ?? randomBytes(8).toString('hex');
  res.headers.set('x-request-id', requestId);

  // ── CSRF check (mutating methods on non-exempt routes) ───────────────────
  if (
    MUTATING_METHODS.has(method) &&
    !CSRF_EXEMPT.some((p) => pathname.startsWith(p))
  ) {
    // Belt-and-braces: origin check
    const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
    const headerOrigin = req.headers.get('origin');

    // In dev, origin may be undefined for server-to-server calls — skip
    if (
      process.env.NODE_ENV === 'production' &&
      expectedOrigin &&
      headerOrigin &&
      headerOrigin !== expectedOrigin
    ) {
      return new NextResponse(JSON.stringify({ error: 'Origin mismatch' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Double-submit cookie check
    // The client must send the CSRF token in the X-CSRF-Token header.
    // The token must match the value in the 'csrf' cookie.
    // (See generateCsrfToken() in lib/auth/csrf.ts — recipe 02)
    const cookieToken = req.cookies.get('csrf')?.value;
    const headerToken = req.headers.get('x-csrf-token');

    // If the client hasn't set a CSRF cookie yet (first visit), allow the request
    // but require the header on subsequent requests. Alternatively, enforce strictly
    // and require CSRF on all mutating calls from the start.
    if (cookieToken && (!headerToken || headerToken !== cookieToken)) {
      return new NextResponse(JSON.stringify({ error: 'CSRF validation failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return res;
}

export const config = {
  // Apply to all routes except Next.js static files and images
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Client-side CSRF token injection

```ts
// lib/fetch-with-csrf.ts
// Wraps fetch to automatically include the CSRF token from the cookie.

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function fetchWithCsrf(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getCsrfToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('X-CSRF-Token', token);

  return fetch(url, { ...init, headers });
}
```

### CSRF token setup for forms (Server Component)

```tsx
// In a Server Component that renders a form:
import { generateCsrfToken } from '@/lib/auth/csrf';

export default async function ContactPage() {
  // Generate token and set cookie — happens server-side during SSR
  const csrfToken = await generateCsrfToken();

  return (
    <form>
      <input type="hidden" name="_csrf" value={csrfToken} />
      {/* ...other fields... */}
    </form>
  );
}
```

## Merging with other middleware

If the project also uses recipe 02 (auth), there can only be one `middleware.ts`. Merge both concerns into a single file using sequential checks:

```ts
// middleware.ts — merged: security headers + CSRF (recipe 11) + auth guard (recipe 02)
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT = ['/preview/auth/oauth/', '/api/webhooks/'];
const PROTECTED = ['/preview/dashboard', '/preview/settings', '/preview/account'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Security headers (this recipe) — applied to all responses
  const res = NextResponse.next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  const requestId = req.headers.get('x-request-id') ?? randomBytes(8).toString('hex');
  res.headers.set('x-request-id', requestId);
  // Add full CSP here (see the standalone middleware.ts above)

  // 2. CSRF check (this recipe) — mutating methods on non-exempt routes
  if (
    MUTATING_METHODS.has(req.method) &&
    !CSRF_EXEMPT.some((p) => pathname.startsWith(p))
  ) {
    const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
    const headerOrigin = req.headers.get('origin');
    if (
      process.env.NODE_ENV === 'production' &&
      expectedOrigin &&
      headerOrigin &&
      headerOrigin !== expectedOrigin
    ) {
      return new NextResponse(JSON.stringify({ error: 'Origin mismatch' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const cookieToken = req.cookies.get('csrf')?.value;
    const headerToken = req.headers.get('x-csrf-token');
    if (cookieToken && (!headerToken || headerToken !== cookieToken)) {
      return new NextResponse(JSON.stringify({ error: 'CSRF validation failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 3. Auth guard (recipe 02) — protected paths require a session cookie
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    const session = req.cookies.get('session');
    if (!session?.value) {
      return NextResponse.redirect(new URL('/preview/login', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

See recipe 02 (`docs/stack/02-auth.md`) for the auth guard details and the full list of `PROTECTED` paths. The key rule: a Next.js project has exactly one `middleware.ts`; never have two recipes each writing their own.

## CSP Notes

The sample CSP in `middleware.ts` is opinionated but permissive enough for most apps:

| Directive | Why |
|-----------|-----|
| `script-src 'unsafe-inline'` | Required for Next.js inline hydration scripts. Cannot be removed without `nonce`. |
| `frame-src 'self'` | Required for the `/preview` iframe in `nextjs-claw`. |
| `connect-src 'self' $S3_ENDPOINT` | Allows browser-to-MinIO presigned PUT (recipe 06). |

To tighten CSP further, implement [nonce-based CSP](https://web.dev/csp/#nonce) — add a random nonce to each `<script>` tag and include `'nonce-<value>'` in `script-src`. This is complex in Next.js because inline scripts are injected by the framework.

## Commands to run

No new npm deps required. The middleware uses only Next.js built-ins and Node `crypto`.

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'harden security', 'add security headers', 'add CSRF protection', or 'secure API routes': follow `docs/stack/11-security-headers-and-csrf.md`. Update (or create) `middleware.ts` with the security headers and CSRF check. Add `fetchWithCsrf` helper for client-side fetches. CSRF-exempt OAuth callback routes and webhook receivers."

## Common pitfalls

- **`unsafe-inline` in `script-src`**: Required for Next.js. If you want to remove it, you need nonce-based CSP which is a significant undertaking. Accept it for now.
- **CSRF and Server Actions**: Do NOT apply the manual CSRF check to Server Action endpoints (`/api/server-action`). Next.js 16 handles CSRF for Server Actions internally via `Origin`/`Host` header checking. Double-checking will cause false rejections.
- **Double-submit and `SameSite=Strict`**: If the `csrf` cookie is `SameSite=Strict`, the browser won't send it on cross-site navigations (including following a link from another site). This means the CSRF check fails on first load from an external link. Use `SameSite=Lax` on the CSRF cookie (as recipe 02 does).
- **HSTS in dev**: The `Strict-Transport-Security` header is set for all environments. In local HTTP dev, browsers ignore it — but it's harmless. In production (HTTPS), it forces HTTPS for 1 year. Do not set `preload` unless you intend to submit your domain to the HSTS preload list.
- **CSP and Tailwind**: Tailwind v4 injects styles at build time into `<style>` tags, which are covered by `style-src 'unsafe-inline'`. Already included.
- **MinIO endpoint in CSP**: The `S3_ENDPOINT` env var is interpolated into the CSP in middleware. This env var is available in middleware (`process.env.*`). If it's not set, the `filter(Boolean)` removes the empty string from the directive.

## Further reading

- OWASP CSRF Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- MDN CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- securityheaders.com — tool to evaluate your headers
- Next.js middleware docs (context7 query: `next.js middleware`)
