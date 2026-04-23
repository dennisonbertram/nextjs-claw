import { spawn } from 'node:child_process';
import type { AgentEvent, ToolName } from './agent-events';
import { summarizeToolInput } from './agent-events';

export interface RunAgentOptions {
  prompt: string;
  projectRoot: string;
  sessionId?: string;      // if set, resume existing claude session
  signal?: AbortSignal;    // client disconnect → kill subprocess
}

const SYSTEM_PROMPT = `You are an AI coding assistant embedded inside a running Next.js 16 app that a
user is building interactively.

═══ PROJECT LAYOUT ═══
This is a two-document setup. The chat panel (this conversation) lives in the
PARENT document at "/". The user's app lives inside an iframe at "/preview".
When the user says "change X" or "make this Y", they mean their app — not the
chat infrastructure.

Editable (USER'S APP — go ahead):
  app/preview/page.tsx         — main page the user sees in the iframe
  app/preview/layout.tsx       — layout wrapping preview (html/body/fonts/metadata)
  app/preview/globals.css      — styles for the user's app
  app/preview/**               — any new files under here
  public/**                    — static assets

Read-only (INFRASTRUCTURE — DO NOT EDIT even if the user asks):
  app/layout.tsx               — outer root layout (trivial)
  app/page.tsx                 — chat shell
  app/shell.css                — chat styling
  app/api/**                   — the agent API that runs YOU
  components/**                — all components (chat panel, iframe wrapper, picker)
  lib/agent-events.ts, lib/agent-engine.ts, lib/use-agent-stream.ts, lib/react-source.ts
  next.config.ts, tsconfig.json, package.json, eslint.config.mjs, postcss.config.mjs

CRITICAL: app/preview/layout.tsx imports <PickBridge /> from
@/components/PickBridge. You MAY edit the layout, but you MUST preserve the
<PickBridge /> import AND its render in the tree — it powers the
click-to-reference feature. If it's missing after your edit, the picker silently
breaks.

If the user asks to modify an infrastructure file, refuse politely and explain
it's the app's own plumbing. Suggest they edit the file manually with a regular
editor if they insist.

═══ HOW TO WORK ═══
- The user often includes "The user clicked these elements…" at the top —
  these are <h1>, <button>, etc. they clicked in the preview. Each has text
  content, Tailwind classes, and a dom path. When present, start with Grep for
  the text content — it's usually unique enough to land on the exact line. Don't
  scan the tree; grep the text. When you find the match, Edit the line.

═══ WHEN THE USER CLICKS ELEMENTS ═══
Prompts may start with "The user clicked these elements…" followed by DOM
snippets (tag, text content, classes, component name). Start by greping for the
text content — it's usually unique enough to land on the exact line. Don't scan
the tree; grep the text. When you find the match, Edit the line.
- Prefer Edit (old_string/new_string) over Write (full rewrite).
- The dev server auto-reloads on save. Your changes appear in the iframe within
  ~2 seconds. You don't need to restart anything.
- Keep changes scoped to what the user asked. Don't refactor unasked.
- If the user asks for a "theme" or "dark mode", edit app/preview/globals.css
  and/or app/preview/layout.tsx body classes — NEVER app/layout.tsx or
  app/shell.css.

═══ PROJECT SNAPSHOT ═══
Framework: Next.js 16.2 + React 19 + TypeScript + Tailwind v4 (via @import "tailwindcss" in CSS).
No tailwind.config.ts; theme uses @theme { ... } in CSS.
Runtime for server code: Node (not Edge).

Key user files and their role:
  app/preview/page.tsx      — primary content surface. Tailwind classes on JSX.
  app/preview/layout.tsx    — document shell for the user's app. Owns <html>, <body>.
  app/preview/globals.css   — imports tailwindcss, sets body bg/color.

Tailwind v4 colorless-config reminder: custom colors go in @theme via CSS
variables, then utility classes can reference them like bg-[--color-primary].
Prefer semantic HTML. Server Components by default; add 'use client' only when
client interactivity is needed.

═══ STACK COOKBOOK ═══
When the user requests a capability (database, auth, email, file uploads, payments, etc.),
read the matching recipe from docs/stack/ BEFORE writing any code. Do not improvise
a different approach — the recipes are opinionated for a reason (self-hosted, no
vendor lock-in, consistent primitives).

Capability → recipe map:
  database / persist data       → docs/stack/01-database.md  (Postgres + Drizzle)
  auth / login / signup         → docs/stack/02-auth.md      (argon2id + sessions + OAuth)
  email / transactional mail    → docs/stack/03-email.md     (SMTP + nodemailer + Mailpit)
  cache / Redis                 → docs/stack/04-cache-and-sessions.md
  background jobs / cron        → docs/stack/05-background-jobs.md  (pg-boss)
  file uploads / storage        → docs/stack/06-file-uploads.md     (MinIO + presigned)
  realtime / WebSockets / SSE   → docs/stack/07-realtime.md
  forms / validation / Zod      → docs/stack/08-validation-and-forms.md
  logging / observability       → docs/stack/09-logging-and-observability.md
  rate limiting                 → docs/stack/10-rate-limiting.md
  security headers / CSRF / CSP → docs/stack/11-security-headers-and-csrf.md
  payments / Stripe             → docs/stack/12-payments.md
  testing                       → docs/stack/13-testing.md  (Vitest + Playwright)
  deployment                    → docs/stack/14-deployment.md

Rules when executing a recipe:
1. Read the recipe first. Follow its file/command/code list precisely.
2. Use the library choices the recipe picks (Drizzle not Prisma, argon2 not bcrypt).
3. Pin all npm deps exactly: \`bun add -E <pkg>\` — never \`^\` or \`~\`.
4. New files go under user-territory dirs: app/preview/**, lib/auth/**, lib/db/**,
   drizzle/**, tests/**, etc. See docs/stack/15-agent-integration.md for the full list.
5. If a recipe needs Docker services (Postgres, Redis, MinIO, Mailpit), assume
   docker-compose.dev.yml is running. If not present, create it from the block in
   docs/stack/00-overview.md and tell the user: "Run: docker compose -f docker-compose.dev.yml up -d".
6. After creating lib/db schema files, run: \`bun db:generate && bun db:migrate\`.
7. Native-addon packages (@node-rs/argon2): warn the user a rebuild may be needed if
   they move between machines.
8. For visual/structural templates (SaaS landing, portfolio, dashboard shell, etc.),
   consult docs/templates/ if it exists — those recipes give you a full Tailwind layout
   to drop into app/preview/page.tsx.`;

export async function* runAgent(opts: RunAgentOptions): AsyncGenerator<AgentEvent, void, void> {
  const { prompt, projectRoot, sessionId, signal } = opts;

  const args = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'acceptEdits',
    '--add-dir', projectRoot,
    '--append-system-prompt', SYSTEM_PROMPT,
  ];
  if (sessionId) args.push('--resume', sessionId);

  // Strip ANTHROPIC_API_KEY so the subprocess uses the OAuth keychain token
  // from `claude login` instead of a potentially stale env-var key.
  const { ANTHROPIC_API_KEY: _unused, ...subprocessEnv } = process.env;
  const proc = spawn('claude', args, {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: subprocessEnv,
  });

  const cleanup = () => { if (!proc.killed) proc.kill('SIGTERM'); };
  signal?.addEventListener('abort', cleanup);

  // ENOENT → claude not installed
  let spawnError: AgentEvent | null = null;
  proc.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      spawnError = {
        type: 'error',
        message: 'Claude Code CLI not found. Install with `npm i -g @anthropic-ai/claude-code`, then run `claude login`.',
      };
    } else {
      spawnError = { type: 'error', message: err.message };
    }
  });

  try {
    for await (const line of readJsonLines(proc.stdout!)) {
      if (spawnError) { yield spawnError; return; }
      const events = translate(line);
      for (const e of events) yield e;
    }
  } finally {
    cleanup();
    signal?.removeEventListener('abort', cleanup);
  }

  if (spawnError) { yield spawnError; return; }

  const code = await once(proc, 'exit') as number;
  if (code !== 0 && code !== null) {
    yield { type: 'error', message: `claude exited with code ${code}` };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function* readJsonLines(
  stream: NodeJS.ReadableStream,
): AsyncGenerator<unknown, void, void> {
  let buffer = '';
  for await (const chunk of stream) {
    buffer += typeof chunk === 'string' ? chunk : (chunk as Buffer).toString('utf8');
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        yield JSON.parse(line);
      } catch {
        // claude occasionally prints non-JSON; skip
      }
    }
  }
  const rest = buffer.trim();
  if (rest) {
    try { yield JSON.parse(rest); } catch {}
  }
}

function once(proc: import('node:child_process').ChildProcess, event: string) {
  return new Promise(resolve => proc.once(event, resolve));
}

function translate(msg: unknown): AgentEvent[] {
  if (!msg || typeof msg !== 'object') return [];
  const m = msg as Record<string, unknown>;
  const out: AgentEvent[] = [];

  // init
  if (m.type === 'system' && m.subtype === 'init' && typeof m.session_id === 'string') {
    out.push({ type: 'session', sessionId: m.session_id });
    return out;
  }

  // assistant turn
  if (m.type === 'assistant' && m.message && typeof m.message === 'object') {
    const content = (m.message as Record<string, unknown>).content as unknown[];
    if (Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        const b = block as Record<string, unknown>;
        if (b.type === 'text' && typeof b.text === 'string') {
          out.push({ type: 'text_delta', content: b.text });
        } else if (b.type === 'tool_use' && typeof b.id === 'string' && typeof b.name === 'string') {
          const input = (b.input ?? {}) as Record<string, unknown>;
          out.push({
            type: 'tool_use',
            id: b.id,
            name: b.name as ToolName,
            input,
            target: summarizeToolInput(b.name as ToolName, input),
          });
        }
      }
      out.push({ type: 'message_end' });
    }
    return out;
  }

  // tool result (nested inside a "user" wrapper)
  if (m.type === 'user' && m.message && typeof m.message === 'object') {
    const content = (m.message as Record<string, unknown>).content as unknown[];
    if (Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        const b = block as Record<string, unknown>;
        if (b.type === 'tool_result' && typeof b.tool_use_id === 'string') {
          const raw = b.content;
          const summary = typeof raw === 'string'
            ? (raw.length > 140 ? raw.slice(0, 137) + '…' : raw)
            : undefined;
          out.push({
            type: 'tool_result',
            id: b.tool_use_id,
            ok: b.is_error !== true,
            summary,
          });
        }
      }
    }
    return out;
  }

  // final
  if (m.type === 'result') {
    out.push({
      type: 'result',
      ok: m.subtype === 'success',
      turns: typeof m.num_turns === 'number' ? m.num_turns : undefined,
      durationMs: typeof m.duration_ms === 'number' ? m.duration_ms : undefined,
      costUsd: typeof m.total_cost_usd === 'number' ? m.total_cost_usd : undefined,
      sessionId: typeof m.session_id === 'string' ? m.session_id : undefined,
    });
    return out;
  }

  return [];
}
