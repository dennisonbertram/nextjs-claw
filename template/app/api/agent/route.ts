import { NextRequest } from 'next/server';
import { runAgent } from '@/lib/agent-engine';
import type { AgentEvent } from '@/lib/agent-events';
import type { ElementRef } from '@/lib/react-source';
import type { AgentSettings } from '@/lib/agent-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // seconds; fine for local dev, ignored there

export async function POST(req: NextRequest) {
  let body: { prompt?: unknown; sessionId?: unknown; references?: unknown; settings?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return badRequest('prompt must be a non-empty string');

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;
  const references = parseReferences(body.references);
  const settings = parseSettings(body.settings);
  const projectRoot = process.cwd();

  const finalPrompt = buildPromptWithReferences(prompt, references);

  const encoder = new TextEncoder();
  const frame = (e: AgentEvent) => encoder.encode(`data: ${JSON.stringify(e)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (e: AgentEvent) => {
        try { controller.enqueue(frame(e)); } catch { /* client gone */ }
      };

      try {
        for await (const event of runAgent({
          prompt: finalPrompt,
          projectRoot,
          sessionId,
          signal: req.signal,
          settings,
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

function parseSettings(raw: unknown): AgentSettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const authMode = obj.authMode === 'api-key' ? 'api-key' : 'subscription';
  const model =
    obj.model === 'opus' || obj.model === 'sonnet' || obj.model === 'haiku'
      ? obj.model
      : 'default';
  const effort =
    obj.effort === 'low' || obj.effort === 'medium' || obj.effort === 'high' ||
    obj.effort === 'xhigh' || obj.effort === 'max'
      ? obj.effort
      : 'default';
  const apiKey =
    typeof obj.apiKey === 'string' && obj.apiKey.length > 0 ? obj.apiKey : undefined;
  return { authMode, model, effort, apiKey };
}

function parseReferences(raw: unknown): ElementRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid = raw.filter((r): r is ElementRef => {
    if (!r || typeof r !== 'object') return false;
    const obj = r as Record<string, unknown>;
    // New schema: tagName + text required; no fileName/lineNumber
    return (
      typeof obj.tagName === 'string' &&
      obj.tagName.length > 0 &&
      typeof obj.text === 'string'
    );
  });
  return valid.length > 0 ? valid : undefined;
}

function buildPromptWithReferences(userPrompt: string, refs: ElementRef[] | undefined): string {
  if (!refs || refs.length === 0) return userPrompt;

  const lines: string[] = [
    'The user clicked these elements in the preview. They\'re pointing to specific',
    'spots in the source. Grep the codebase for the text or class strings to locate',
    'them precisely — the source files are under `app/preview/`.',
    '',
  ];

  refs.forEach((r, i) => {
    lines.push(`${i + 1}. <${r.tagName}>${r.text ? ` "${r.text}"` : ''}`);
    if (r.classes && r.classes.length > 0) {
      lines.push(`   classes: ${r.classes.join(' ')}`);
    }
    if (r.domPath) {
      lines.push(`   dom path: ${r.domPath}`);
    }
    if (r.componentChain) {
      lines.push(`   component: ${r.componentChain.split(' → ')[0]}`);
    }
  });

  lines.push('');
  lines.push(`User request: ${userPrompt}`);

  return lines.join('\n');
}
