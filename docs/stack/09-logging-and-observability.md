# 09 — Logging and Observability (pino)

## What this gives you

Structured JSON logs using `pino`. In dev, logs are pretty-printed to stdout. In production, they're JSON to stdout or a file — ready to pipe into any log aggregator (Loki, Datadog, Grafana, CloudWatch) without code changes. Includes request ID middleware, PII redaction, and child logger patterns.

## When to reach for it / when not to

- **Use** for every server-side log. Never use bare `console.log` in production code.
- **Skip OpenTelemetry**: OTel is powerful but heavy (~40 MB of deps). For most apps, structured JSON logs + a log aggregator give 90% of the visibility at 5% of the complexity.
- **Skip** shipping logs from browser (client components). Browser logs go to the browser DevTools; use an error monitoring service (Sentry) separately if needed.

## Decision rationale

**pino over winston**: pino is 5–10x faster than winston (JSON serialization benchmarks), uses streams correctly, and has first-class async logging. Its API is smaller and easier to reason about. winston is fine but carries more historical baggage.

**stdout first**: Never write logs directly to a file in production. Write to stdout; let the container orchestrator or systemd capture and rotate them. Use `pino/file` or a transport only when you have a specific reason.

## Files the agent creates

- `lib/logger/index.ts` — pino singleton with redaction config
- `lib/logger/middleware.ts` — Next.js middleware that stamps a request ID
- `lib/logger/request-log.ts` — per-request child logger helper

## Code

### `lib/logger/index.ts`

```ts
// lib/logger/index.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Fields to redact before serialization.
// Paths are dot-separated. Wildcards supported.
const REDACT_PATHS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'secret',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionId',
  'session_id',
  'authorization',
  'req.headers.cookie',
  'req.headers.authorization',
  '*.password',
  '*.token',
  '*.secret',
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    // Base fields added to every log line
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV,
    },
    // ISO timestamp
    timestamp: pino.stdTimeFunctions.isoTime,
    // Error serializer: include stack trace
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:HH:MM:ss.l',
        },
      })
    : process.stdout,
);

// Child logger factory — adds context fields to all logs from that scope
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
```

### `lib/logger/middleware.ts`

```ts
// lib/logger/middleware.ts
// Stamps an X-Request-ID header on every request and response.
// Middleware runs at the edge, so keep it import-light.

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export function withRequestId(
  req: NextRequest,
  next: () => NextResponse | Promise<NextResponse>,
): NextResponse | Promise<NextResponse> {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  const requestId = incoming ?? randomBytes(8).toString('hex');

  const res = next() as NextResponse;
  if (res instanceof Promise) {
    return res.then((r) => { r.headers.set(REQUEST_ID_HEADER, requestId); return r; });
  }
  res.headers.set(REQUEST_ID_HEADER, requestId);
  return res;
}
```

### `lib/logger/request-log.ts`

```ts
// lib/logger/request-log.ts
// Creates a child logger scoped to a single request.
// Use at the top of route handlers to get structured per-request logs.

import { createLogger } from './index';
import { REQUEST_ID_HEADER } from './middleware';
import type { NextRequest } from 'next/server';

export function requestLogger(req: NextRequest) {
  const requestId = req.headers.get(REQUEST_ID_HEADER) ?? 'unknown';
  return createLogger({
    requestId,
    method: req.method,
    path: req.nextUrl.pathname,
  });
}
```

### Usage in a route handler

```ts
// app/preview/api/some/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requestLogger } from '@/lib/logger/request-log';

export async function POST(req: NextRequest) {
  const log = requestLogger(req);
  log.info('handling request');

  try {
    const data = await req.json();
    log.debug({ data }, 'parsed body');
    // ... do work ...
    log.info('request complete');
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'request failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### `middleware.ts` — add request ID stamping

```ts
// middleware.ts (update existing or create)
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

export function middleware(req: NextRequest) {
  const requestId =
    req.headers.get('x-request-id') ?? randomBytes(8).toString('hex');

  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

## Commands to run

```bash
bun add -E pino
bun add -E pino-pretty --dev   # dev pretty-printer (never import in prod code)
```

Add `LOG_LEVEL` to `.env.local`:
```bash
LOG_LEVEL=debug
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add logging', 'log errors', 'add structured logs': follow `docs/stack/09-logging-and-observability.md`. Run `bun add -E pino` and `bun add -E pino-pretty --dev`. Create `lib/logger/index.ts`. Import `logger` or `requestLogger` in route handlers instead of using `console.log`."

## Common pitfalls

- **`pino-pretty` in production**: Never use `pino-pretty` in production builds. It writes unstructured human-readable text — log aggregators cannot parse it. The code above guards with `isDev`.
- **Async logging**: pino uses synchronous writes by default (to avoid losing logs on crash). In high-throughput scenarios, use `pino.destination()` with `sync: false` and handle the `SIGTERM` drain.
- **Circular references**: pino handles circular references in serialized objects by truncating them. But very deep objects can still slow serialization. Keep log data shallow.
- **Redaction is not encryption**: `[REDACTED]` replaces the value before the string is written. The original value never touches the log output. But if you log the raw request body before redaction, the sensitive field is still in the log. Always log post-parse structured data, not raw strings.
- **Request ID thread**: The request ID is stamped in middleware, but Next.js route handlers and Server Components run in separate contexts. Pass the request ID explicitly to child loggers (as shown in `requestLogger`). There is no Node.js `AsyncLocalStorage` magic here — that's possible but out of scope.
- **Client-side logging**: `logger` is a server-only module. Importing it in a Client Component will fail. Keep it in server files only.

## Further reading

- pino docs (context7 query: `pino`)
- pino GitHub: https://github.com/pinojs/pino
- Pino transport API: https://getpino.io/#/docs/transports
