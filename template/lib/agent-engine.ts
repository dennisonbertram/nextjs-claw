import { spawn } from 'node:child_process';
import type { AgentEvent, ToolName } from './agent-events';
import { summarizeToolInput } from './agent-events';

export interface RunAgentOptions {
  prompt: string;
  projectRoot: string;
  sessionId?: string;      // if set, resume existing claude session
  signal?: AbortSignal;    // client disconnect → kill subprocess
}

const SYSTEM_PROMPT =
  'You are an AI coding assistant embedded inside a running Next.js 16 app that a ' +
  'user is building interactively. The main editable page is at app/page.tsx in ' +
  'the project root. Prefer small, precise Edit calls over full rewrites. Do not ' +
  'modify package.json, tsconfig.json, next.config.ts, or files under ' +
  'app/api/agent/ unless the user explicitly asks. The dev server auto-reloads on ' +
  'save, so changes appear immediately.';

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
