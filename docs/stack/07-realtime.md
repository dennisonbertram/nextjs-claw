# 07 — Realtime (SSE → WebSockets → LISTEN/NOTIFY)

## What this gives you

Three tiers of realtime, ordered by implementation complexity. Start with the simplest that covers your use case; upgrade only when necessary.

- **Tier 1 — Server-Sent Events (SSE)**: One-way push from server to browser. Already used by the agent stream in this very codebase. Zero new infrastructure.
- **Tier 2 — WebSockets**: Bidirectional. Requires a custom Next.js server or a standalone WS process.
- **Tier 3 — Postgres LISTEN/NOTIFY**: App-internal pub/sub between server processes. Useful for fanning out DB changes to SSE/WS connections.

## When to reach for each tier

| Need | Tier |
|------|------|
| Push notifications, live feeds, progress updates | SSE |
| Chat, collaborative editing, multiplayer | WebSockets |
| Fan out a DB change to all connected clients | LISTEN/NOTIFY → SSE or WS |
| Just polling every 5s is fine | Don't bother with any of this |

**Recommendation**: Start with SSE. 90% of "realtime" features are one-way push — new messages, background job progress, live dashboards. Add WebSockets only when the browser must send frequent structured messages to the server (not just click events).

## Decision rationale

This codebase already uses SSE (the agent stream in `app/api/agent/route.ts`). The pattern is proven and well-understood here. WebSockets via `ws` in a custom server is the next step up — no SaaS socket service needed, runs on the same machine. LISTEN/NOTIFY is the secret weapon: instead of polling Postgres for changes, your WS/SSE handlers subscribe to Postgres channels and fan out changes instantly.

## Files the agent creates

### Tier 1 (SSE)

- `app/preview/api/events/route.ts` — generic SSE endpoint for the user's app
- `lib/sse.ts` — SSE response helpers

### Tier 2 (WebSockets)

- `server.ts` — custom Next.js server with `ws`
- `lib/ws-server.ts` — WebSocket server logic

### Tier 3 (LISTEN/NOTIFY)

- `lib/db/notify.ts` — Postgres NOTIFY helper
- `lib/db/listen.ts` — long-lived LISTEN client

## Code

### Tier 1 — SSE helper and example endpoint

```ts
// lib/sse.ts
// Helpers for building SSE responses.

export function createSSEStream(
  generator: (send: SSESender) => Promise<void> | void,
  signal?: AbortSignal,
): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const send: SSESender = {
    data(data: unknown, eventType?: string) {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      const lines = eventType
        ? `event: ${eventType}\ndata: ${payload}\n\n`
        : `data: ${payload}\n\n`;
      writer.write(encoder.encode(lines)).catch(() => {});
    },
    comment(msg: string) {
      writer.write(encoder.encode(`: ${msg}\n\n`)).catch(() => {});
    },
    close() {
      writer.close().catch(() => {});
    },
  };

  signal?.addEventListener('abort', () => send.close());

  Promise.resolve(generator(send))
    .catch((err) => {
      console.error('[SSE] generator error:', err);
    })
    .finally(() => {
      writer.close().catch(() => {});
    });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Prevents Nginx buffering SSE
    },
  });
}

export interface SSESender {
  data(data: unknown, eventType?: string): void;
  comment(msg: string): void;
  close(): void;
}
```

```ts
// app/preview/api/events/route.ts
// Generic SSE endpoint. Replace the mock generator with real logic.

import { NextRequest } from 'next/server';
import { createSSEStream } from '@/lib/sse';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { signal } = req;

  return createSSEStream(async (send) => {
    // Example: send a heartbeat every 15 seconds
    // Replace this with LISTEN/NOTIFY (Tier 3) or real app events
    let tick = 0;
    while (!signal.aborted) {
      send.data({ type: 'heartbeat', tick: ++tick });
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 15_000);
        signal.addEventListener('abort', () => { clearTimeout(t); resolve(); });
      });
    }
  }, signal);
}
```

### Tier 2 — Custom Next.js server with WebSockets

```ts
// server.ts — replaces `next start`
// Run with: node --loader tsx server.ts
// In package.json: "start": "node --loader tsx server.ts"

import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => {
  const parsedUrl = parse(req.url!, true);
  handle(req, res, parsedUrl);
});

const wss = new WebSocketServer({ noServer: true });

// Connection registry: roomId → Set<WebSocket>
const rooms = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room') ?? 'default';

  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  const room = rooms.get(roomId)!;
  room.add(ws);

  ws.on('message', (raw) => {
    let msg: unknown;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    // Broadcast to all other clients in the room
    for (const client of room) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    }
  });

  ws.on('close', () => {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomId);
  });

  ws.on('error', (err) => console.error('[WS] error:', err));
});

// Upgrade HTTP → WS for /ws path only
httpServer.on('upgrade', (req, socket, head) => {
  const { pathname } = parse(req.url ?? '');
  if (pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

const port = parseInt(process.env.PORT ?? '3000', 10);
httpServer.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});
```

### Tier 3 — Postgres LISTEN/NOTIFY

```ts
// lib/db/notify.ts
// Send a Postgres NOTIFY from anywhere in the app.
// Use when a DB change should be pushed to connected clients.

import { pool } from '@/lib/db';

export async function pgNotify(channel: string, payload: unknown): Promise<void> {
  const json = JSON.stringify(payload);
  // NOTIFY channel, 'payload' — payload max 8000 bytes in Postgres
  await pool.query(`SELECT pg_notify($1, $2)`, [channel, json]);
}
```

```ts
// lib/db/listen.ts
// A dedicated pg.Client that holds a LISTEN connection.
// One client per channel. Do NOT use pool.connect() for LISTEN —
// pool connections are recycled and lose their LISTEN subscriptions.

import { Client } from 'pg';

type Listener = (payload: unknown) => void;

export class PgListener {
  private client: Client;
  private listeners = new Map<string, Set<Listener>>();
  private connected = false;

  constructor() {
    this.client = new Client({ connectionString: process.env.DATABASE_URL });
    this.client.on('notification', (msg) => {
      const handlers = this.listeners.get(msg.channel);
      if (!handlers) return;
      let payload: unknown;
      try { payload = msg.payload ? JSON.parse(msg.payload) : null; } catch { payload = msg.payload; }
      for (const fn of handlers) fn(payload);
    });
    this.client.on('error', (err) => console.error('[PgListener]', err));
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.client.connect();
    this.connected = true;
  }

  async subscribe(channel: string, fn: Listener): Promise<() => void> {
    await this.connect();
    if (!this.listeners.has(channel)) {
      await this.client.query(`LISTEN ${this.client.escapeIdentifier(channel)}`);
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(fn);

    return async () => {
      const set = this.listeners.get(channel);
      if (!set) return;
      set.delete(fn);
      if (set.size === 0) {
        this.listeners.delete(channel);
        await this.client.query(`UNLISTEN ${this.client.escapeIdentifier(channel)}`);
      }
    };
  }
}

// Singleton for the app
export const pgListener = new PgListener();
```

Example: SSE endpoint that fans out Postgres NOTIFYs:

```ts
// app/preview/api/live/[channel]/route.ts
import { NextRequest } from 'next/server';
import { createSSEStream } from '@/lib/sse';
import { pgListener } from '@/lib/db/listen';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel } = await params;
  const { signal } = req;

  return createSSEStream(async (send) => {
    const unsubscribe = await pgListener.subscribe(channel, (payload) => {
      send.data(payload);
    });
    signal.addEventListener('abort', () => unsubscribe());
    // Keep alive until client disconnects
    await new Promise<void>((resolve) => signal.addEventListener('abort', resolve));
    await unsubscribe();
  }, signal);
}
```

## Commands to run

```bash
# Tier 1 — no new deps (uses Web Streams API built into Next.js 16)

# Tier 2 — WebSockets
bun add -E ws
bun add -E @types/ws --dev

# Tier 3 — LISTEN/NOTIFY uses `pg` (already installed in recipe 01)
```

Update `package.json` scripts for custom server:
```json
{
  "scripts": {
    "dev": "node --loader tsx server.ts",
    "start": "NODE_ENV=production node --loader tsx server.ts"
  }
}
```

## Integration hook — how the embedded agent invokes this

> "When the user asks for 'realtime updates', 'live data', 'push notifications to the browser': follow `docs/stack/07-realtime.md`. Start with Tier 1 (SSE). Only move to Tier 2 (WebSockets) if bidirectional communication is required. Use Tier 3 (LISTEN/NOTIFY) to bridge database changes to connected clients."

## Common pitfalls

- **SSE and Nginx buffering**: Add `X-Accel-Buffering: no` and `Cache-Control: no-cache` headers. The `createSSEStream` helper does this already.
- **SSE connection limit**: Browsers cap same-origin SSE connections at 6 per tab. If you have multiple SSE endpoints open simultaneously, you'll hit this limit. Multiplex via a single SSE stream with event types.
- **WebSocket and `next dev`**: `next dev` does not support HTTP upgrade (WebSocket). You must use the custom `server.ts` approach even in development.
- **LISTEN connection**: Never use a pool connection for LISTEN. Pool connections are returned to the pool (and potentially reused by other queries) after each use, which drops the LISTEN subscription. Use a dedicated `pg.Client` as shown.
- **Payload size**: `pg_notify` payloads are limited to ~8 KB. For larger payloads, notify with an ID and have the client fetch the full data.
- **Horizontal scaling**: Both SSE and WS connections are per-process. If you run 2+ Next.js processes behind a load balancer, a NOTIFY from process A won't reach clients connected to process B unless you use a shared pub/sub (Redis, or a LISTEN connection in each process — the latter works because all processes share the same Postgres).

## Further reading

- MDN EventSource (SSE): https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- `ws` package (context7 query: `ws`)
- Postgres LISTEN/NOTIFY: https://www.postgresql.org/docs/16/sql-listen.html
