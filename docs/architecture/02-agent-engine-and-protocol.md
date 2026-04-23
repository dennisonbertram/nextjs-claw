# 02 — Agent Engine and Event Protocol

This is the most load-bearing doc. It defines (a) the wire protocol between server and client, and (b) the subprocess wrapper that gives the app its editing power.

## Files

- `template/lib/agent-events.ts` — shared types (imported by both server and client).
- `template/lib/agent-engine.ts` — the subprocess wrapper.

## Design rationale — why subprocess, not SDK

The official `@anthropic-ai/claude-agent-sdk` TS package requires `ANTHROPIC_API_KEY` and Anthropic's TOS (April 2026) forbids third-party apps from using subscription OAuth for end users. For personal / local use of the `claude` CLI binary, however, the subscription token is the CLI's normal mode of operation. By spawning `claude` as a child process, we inherit that auth mechanism transparently. No dependency on the SDK, no API key configuration, and full access to the CLI's built-in tools (Read, Write, Edit, Glob, Grep, Bash, WebFetch, …) that ship with Claude Code.

Tradeoff: we're coupled to the user having Claude Code CLI installed and logged in. The health endpoint + HealthBanner UI will surface this clearly.

## Event protocol — `template/lib/agent-events.ts`

Full file content:

```ts
export type ToolName =
  | 'Read'
  | 'Write'
  | 'Edit'
  | 'Glob'
  | 'Grep'
  | 'Bash'
  | 'WebFetch'
  | 'WebSearch'
  | 'TodoWrite'
  | 'Task'
  | (string & {}); // fall through for anything Claude adds later

export type AgentEvent =
  | { type: 'session'; sessionId: string }
  | { type: 'text_delta'; content: string }
  | { type: 'tool_use'; id: string; name: ToolName; input: Record<string, unknown>; target?: string }
  | { type: 'tool_result'; id: string; ok: boolean; summary?: string }
  | { type: 'message_end' }
  | {
      type: 'result';
      ok: boolean;
      turns?: number;
      durationMs?: number;
      costUsd?: number;
      sessionId?: string;
    }
  | { type: 'error'; message: string };

/** Derive a short human label from a tool call's input. Used by the UI chip. */
export function summarizeToolInput(name: ToolName, input: Record<string, unknown>): string {
  const s = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : undefined);
  switch (name) {
    case 'Read':
    case 'Write':
    case 'Edit':
      return s('file_path') ?? s('path') ?? '';
    case 'Glob':
      return s('pattern') ?? '';
    case 'Grep':
      return s('pattern') ?? '';
    case 'Bash': {
      const cmd = s('command') ?? '';
      return cmd.length > 60 ? cmd.slice(0, 57) + '…' : cmd;
    }
    case 'WebFetch':
      return s('url') ?? '';
    case 'WebSearch':
      return s('query') ?? '';
    case 'TodoWrite':
      return `${(input.todos as unknown[] | undefined)?.length ?? 0} todos`;
    case 'Task':
      return s('description') ?? '';
    default:
      return '';
  }
}
```

Keep this file tiny — it's the contract. Server produces `AgentEvent`s; client consumes them via SSE.

## Engine — `template/lib/agent-engine.ts`

### Signature

```ts
export interface RunAgentOptions {
  prompt: string;
  projectRoot: string;
  sessionId?: string;      // if set, resume existing claude session
  signal?: AbortSignal;    // client disconnect → kill subprocess
}

export function runAgent(opts: RunAgentOptions): AsyncIterable<AgentEvent>;
```

Use an async generator (`async function* runAgent(...)`).

### claude CLI invocation

**Verify flags first** by running `claude --help | head -80` at the start of the build session; update this doc if anything has drifted. Expected as of Jan 2026:

| Flag | Purpose |
|------|---------|
| `-p "<prompt>"` | Print (non-interactive) mode with a single prompt |
| `--output-format stream-json` | Newline-delimited JSON events on stdout |
| `--verbose` | **Required** with `stream-json` — CLI errors without it |
| `--permission-mode acceptEdits` | Auto-approve all Edit/Write tool calls |
| `--add-dir <path>` | Explicitly allow file ops inside `<path>` |
| `--append-system-prompt "<text>"` | Inject additional system instructions |
| `--resume <session-id>` | Continue an existing session (multi-turn) |

### System prompt

Short, concrete. Example:

```
You are an AI coding assistant embedded inside a running Next.js 16 app that a
user is building interactively. The main editable page is at app/page.tsx in
the project root. Prefer small, precise Edit calls over full rewrites. Do not
modify package.json, tsconfig.json, next.config.ts, or files under
app/api/agent/ unless the user explicitly asks. The dev server auto-reloads on
save, so changes appear immediately.
```

### Implementation sketch

```ts
import { spawn } from 'node:child_process';
import type { AgentEvent, ToolName } from './agent-events';
import { summarizeToolInput } from './agent-events';

const SYSTEM_PROMPT = `...`; // as above

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

  const proc = spawn('claude', args, {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
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
    for await (const line of readJsonLines(proc.stdout)) {
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
```

### Line reader

Claude's stream-json can split across chunk boundaries. Buffer on a trailing partial line:

```ts
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
```

### Translation — claude stream-json → AgentEvent

Claude's output messages (as of Jan 2026) come in these shapes. The translator must handle them all.

```jsonc
// 1. Init
{"type":"system","subtype":"init","session_id":"abc123","tools":["Read","Edit",…],"model":"…"}

// 2. Assistant turn (may contain text and/or tool_use blocks)
{"type":"assistant","message":{"role":"assistant","content":[
  {"type":"text","text":"Let me look at the homepage…"},
  {"type":"tool_use","id":"tu_01","name":"Read","input":{"file_path":"app/page.tsx"}}
]}}

// 3. Tool result (claude feeds back tool output as a user turn)
{"type":"user","message":{"role":"user","content":[
  {"type":"tool_result","tool_use_id":"tu_01","content":"…","is_error":false}
]}}

// 4. Final
{"type":"result","subtype":"success","duration_ms":4321,"total_cost_usd":0.0023,"num_turns":3,"result":"Changed hero","session_id":"abc123"}
```

Translator:

```ts
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
    const content = (m.message as any).content as unknown[];
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
    const content = (m.message as any).content as unknown[];
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

  return out;
}
```

### Behavior contract

1. First yielded event is **always either** `{ type: 'session', … }` **or** `{ type: 'error', … }`.
2. Every `tool_use` is eventually followed by a matching `tool_result` with the same `id` (unless the run aborts).
3. A run ends with exactly one of: `{ type: 'result' }`, `{ type: 'error' }`, or caller abort.
4. If the caller aborts via `signal`, the generator may stop before `result`; the subprocess is killed.

### Error cases

| Case | Event emitted |
|------|---------------|
| `claude` not on PATH (ENOENT) | `{ type: 'error', message: "Claude Code CLI not found…" }` with install hint |
| Nonzero exit code | `{ type: 'error', message: "claude exited with code N" }` |
| JSON parse failure on a line | Silently skipped (claude occasionally logs plain text) |
| Client abort | Generator returns; no further events |

## Gotchas

- `--verbose` is **not** optional with `stream-json`; skipping it causes the CLI to exit with "verbose required".
- When the agent edits a file, the Next.js dev server hot-reloads — including this very API route. If the route file gets touched mid-stream, the response dies. Keep the engine's system prompt telling claude to stay out of `app/api/agent/` unless asked. The server handler also wraps everything in try/catch and emits a graceful error event.
- On macOS, claude CLI reads its OAuth token from the system Keychain; the subprocess inherits Keychain access from the parent user process. No special env var needed if `claude login` has been run. On Linux, export `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`. Document both in template README.
- Do NOT pass the system prompt as `--system-prompt` (that replaces the default). Use `--append-system-prompt` (additive) — claude's default system prompt is what gives it its code-editing competence.
