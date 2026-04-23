# 03 — API Routes

Two routes inside `template/app/api/agent/`:

- `route.ts` — POST, SSE stream of `AgentEvent`.
- `health/route.ts` — GET, reports whether `claude` CLI is available.

Both use the Node runtime. Neither touches the filesystem directly; they delegate to `lib/agent-engine.ts`.

## POST `/api/agent` — `template/app/api/agent/route.ts`

### Request

```jsonc
// application/json
{
  "prompt": "Change the hero title to 'Hello, Claude'.",
  "sessionId": "abc123"   // optional; omit for first turn
}
```

### Response

`text/event-stream`. Each `AgentEvent` is one SSE frame:

```
data: {"type":"session","sessionId":"abc123"}

data: {"type":"text_delta","content":"Let me look at the page…"}

data: {"type":"tool_use","id":"tu_01","name":"Read","input":{"file_path":"app/page.tsx"},"target":"app/page.tsx"}

data: {"type":"tool_result","id":"tu_01","ok":true}

data: {"type":"result","ok":true,"turns":3,"durationMs":4200}
```

### Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

`X-Accel-Buffering: no` prevents proxy buffering (nginx / bun's dev server / vercel).

### Handler skeleton

```ts
// template/app/api/agent/route.ts
import { NextRequest } from 'next/server';
import { runAgent } from '@/lib/agent-engine';
import type { AgentEvent } from '@/lib/agent-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // seconds; fine for local dev, ignored there

export async function POST(req: NextRequest) {
  let body: { prompt?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return badRequest('prompt must be a non-empty string');

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;
  const projectRoot = process.cwd();

  const encoder = new TextEncoder();
  const frame = (e: AgentEvent) => encoder.encode(`data: ${JSON.stringify(e)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (e: AgentEvent) => {
        try { controller.enqueue(frame(e)); } catch { /* client gone */ }
      };

      try {
        for await (const event of runAgent({
          prompt,
          projectRoot,
          sessionId,
          signal: req.signal,
        })) {
          enqueue(event);
        }
      } catch (err) {
        enqueue({
          type: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        try { controller.close(); } catch {}
      }
    },
    cancel() {
      // Body consumer cancelled; engine signal (req.signal) already fires.
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Contract

- Always writes at least one SSE frame before closing (a `session`, `result`, or `error`).
- Never throws past the handler boundary — errors turn into an `error` event.
- Client disconnect triggers `req.signal.abort()`, which the engine uses to kill the subprocess.

### Why SSE, not WebSockets

One-way server → client push is all we need. SSE is plain HTTP, streams naturally through `fetch()` + `ReadableStream` in the browser, auto-reconnects if the connection drops (we don't need it, but it's free), and needs zero extra infra. Next.js route handlers return a streaming `Response` cleanly.

## GET `/api/agent/health` — `template/app/api/agent/health/route.ts`

### Response

```jsonc
// ok
{ "ok": true, "claudeVersion": "claude-code 0.8.2" }

// missing
{
  "ok": false,
  "hint": "Install Claude Code CLI: npm i -g @anthropic-ai/claude-code, then run `claude login`."
}
```

### Handler

```ts
// template/app/api/agent/health/route.ts
import { spawnSync } from 'node:child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = spawnSync('claude', ['--version'], {
      encoding: 'utf8',
      timeout: 2000,
    });
    if (res.error || res.status !== 0) throw res.error ?? new Error('nonzero exit');
    const version = (res.stdout || res.stderr).trim();
    return Response.json({ ok: true, claudeVersion: version });
  } catch {
    return Response.json({
      ok: false,
      hint:
        'Install Claude Code CLI: `npm i -g @anthropic-ai/claude-code`, then run `claude login`.',
    });
  }
}
```

### Client usage

`AppShell` fetches `/api/agent/health` on mount. If `ok: false`, renders `<HealthBanner>` at the top of the chat panel (or a global banner) with the hint. Otherwise, silent.

Re-check health whenever a `tool_use` or `result` event implies the CLI is alive — or just let the banner stay hidden after the first successful check.

## Route co-location

Keep `app/api/agent/route.ts` and `app/api/agent/health/route.ts` in sibling folders per Next.js App Router conventions. The agent's system prompt tells it not to touch these files, reducing the risk of it editing its own brain stem mid-stream.
