import { NextRequest } from 'next/server';
import { runAgent } from '@/lib/agent-engine';
import type { AgentEvent } from '@/lib/agent-events';
import type { ElementRef } from '@/lib/react-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // seconds; fine for local dev, ignored there

export async function POST(req: NextRequest) {
  let body: { prompt?: unknown; sessionId?: unknown; references?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return badRequest('prompt must be a non-empty string');

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;
  const references = parseReferences(body.references);
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

function parseReferences(raw: unknown): ElementRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid = raw.filter((r): r is ElementRef => {
    if (!r || typeof r !== 'object') return false;
    const obj = r as Record<string, unknown>;
    return (
      typeof obj.fileName === 'string' &&
      typeof obj.lineNumber === 'number' &&
      obj.lineNumber > 0 &&
      typeof obj.tagName === 'string'
    );
  });
  return valid.length > 0 ? valid : undefined;
}

function buildPromptWithReferences(userPrompt: string, refs: ElementRef[] | undefined): string {
  if (!refs || refs.length === 0) return userPrompt;
  const lines = refs.map((r, i) => {
    const txt = r.textSnippet ? ` "${r.textSnippet}"` : '';
    return `  ${i + 1}. <${r.tagName.toLowerCase()}>${txt} — ${r.fileName}:${r.lineNumber} (component: ${r.componentName})`;
  });
  return [
    'The user clicked these elements in the preview. They are referring to these specifically:',
    ...lines,
    '',
    `User request: ${userPrompt}`,
  ].join('\n');
}
