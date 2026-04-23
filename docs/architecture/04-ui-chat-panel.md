# 04 — UI: Slide-out Chat Panel

A right-side panel that **pushes** the main content when open (not a modal overlay). Smooth width transition. Shows streamed assistant text, tool-call chips, and a composer.

## Component tree

```
app/layout.tsx
  └── AppShell  (client)
        ├── <main>  — children (the app being built)
        └── ChatPanel  (client)
              ├── HealthBanner
              ├── MessageList
              │     └── MessageItem[]
              │           ├── (assistant text)
              │           └── ToolChip[]
              └── Composer
```

All components live in `template/components/`.

## Files

### `template/app/layout.tsx` — modify

Wrap `{children}` with `<AppShell>`. Existing file from create-next-app:

```tsx
// template/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'The Infinite App',
  description: 'A Next.js app that builds itself.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

Update or create `globals.css` with Tailwind v4 directives:

```css
@import "tailwindcss";

@theme {
  --font-sans: ui-sans-serif, system-ui, sans-serif;
}

html, body { height: 100%; }
```

### `template/components/AppShell.tsx` (client)

Owns: open/closed state, health check result, conversation state, stream lifecycle. Splits the viewport into a flex row; the main pane takes remaining width; the chat occupies 400px when open, 0 when closed. Use CSS transitions for smooth sliding.

```tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import ChatPanel from './ChatPanel';
import { useAgentStream } from '@/lib/use-agent-stream';

const PANEL_WIDTH = 420;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true); // open by default on first load
  const [health, setHealth] = useState<{ ok: boolean; hint?: string } | null>(null);
  const agent = useAgentStream();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/agent/health')
      .then(r => r.json())
      .then(j => { if (!cancelled) setHealth(j); })
      .catch(() => { if (!cancelled) setHealth({ ok: false, hint: 'Health check failed.' }); });
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(() => setOpen(v => !v), []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <main
        className="relative flex-1 overflow-auto transition-[margin] duration-300 ease-out"
        style={{ marginRight: open ? 0 : 0 }}  // unused — panel is sibling
      >
        {children}
        {!open && (
          <button
            onClick={toggle}
            aria-label="Open chat"
            className="fixed right-4 top-4 z-50 rounded-full border border-neutral-700 bg-neutral-900/90 px-3 py-2 text-sm shadow-lg hover:bg-neutral-800"
          >
            ✨ Chat
          </button>
        )}
      </main>
      <aside
        className="shrink-0 border-l border-neutral-800 bg-neutral-900 transition-[width] duration-300 ease-out overflow-hidden"
        style={{ width: open ? PANEL_WIDTH : 0 }}
        aria-hidden={!open}
      >
        <div style={{ width: PANEL_WIDTH }} className="h-full">
          <ChatPanel
            onClose={toggle}
            health={health}
            messages={agent.messages}
            running={agent.running}
            sessionId={agent.sessionId}
            onSend={agent.send}
            onStop={agent.stop}
          />
        </div>
      </aside>
    </div>
  );
}
```

Design notes:
- `flex h-screen w-screen`: the two siblings split the viewport.
- The panel has `width: 420 | 0` with a CSS transition. The inner div keeps a fixed width while the outer shrinks, producing the "slides in from the right, pushing content" feel (no content reflow jank mid-transition).
- Toggle button appears only when closed. When open, the close button lives inside `ChatPanel`'s header.
- Health check runs once on mount.

### `template/components/ChatPanel.tsx`

Presentational. Accepts all state as props.

```tsx
'use client';
import MessageList from './MessageList';
import Composer from './Composer';
import HealthBanner from './HealthBanner';
import type { ChatMessage } from '@/lib/use-agent-stream';

interface Props {
  onClose: () => void;
  health: { ok: boolean; hint?: string } | null;
  messages: ChatMessage[];
  running: boolean;
  sessionId?: string;
  onSend: (prompt: string) => void;
  onStop: () => void;
}

export default function ChatPanel({ onClose, health, messages, running, onSend, onStop }: Props) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Build this app</h2>
          <p className="text-xs text-neutral-400">Describe what you want. I&apos;ll edit the code.</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
        >
          ✕
        </button>
      </header>
      {health && !health.ok && <HealthBanner hint={health.hint} />}
      <MessageList messages={messages} running={running} />
      <Composer
        disabled={health ? !health.ok : false}
        running={running}
        onSend={onSend}
        onStop={onStop}
      />
    </div>
  );
}
```

### `template/components/MessageList.tsx`

Scrolls to bottom when new content arrives. Empty state shown when no messages.

```tsx
'use client';
import { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import type { ChatMessage } from '@/lib/use-agent-stream';

export default function MessageList({ messages, running }: { messages: ChatMessage[]; running: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, running]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="space-y-3 text-sm text-neutral-400">
          <p>Try:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Change the hero title to &ldquo;Hello, Claude&rdquo;</li>
            <li>Add a pricing section with three tiers</li>
            <li>Make this a SaaS dashboard with a sidebar</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <ol className="space-y-4">
        {messages.map((m, i) => (
          <li key={i}>
            <MessageItem message={m} />
          </li>
        ))}
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
```

### `template/components/MessageItem.tsx`

Renders a user or assistant message. Assistant messages interleave text and `ToolChip`s in visual order.

```tsx
'use client';
import ToolChip from './ToolChip';
import type { ChatMessage } from '@/lib/use-agent-stream';

export default function MessageItem({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white">
        {message.text}
      </div>
    );
  }
  return (
    <div className="max-w-[95%] space-y-2 text-sm text-neutral-200">
      {message.parts.map((p, i) =>
        p.kind === 'text' ? (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">{p.text}</p>
        ) : (
          <ToolChip key={i} tool={p} />
        )
      )}
    </div>
  );
}
```

### `template/components/ToolChip.tsx`

The star of the UI. A compact chip that shows the tool icon, name, `target`, and state (running → done/failed). Icon map:

| Tool | Icon |
|------|------|
| Read | `📖` |
| Write | `✍️` |
| Edit | `✏️` |
| Glob | `🔎` |
| Grep | `🔍` |
| Bash | `▶️` |
| WebFetch / WebSearch | `🌐` |
| TodoWrite | `📋` |
| default | `🔧` |

```tsx
'use client';
import type { ToolPart } from '@/lib/use-agent-stream';

const ICONS: Record<string, string> = {
  Read: '📖', Write: '✍️', Edit: '✏️', Glob: '🔎', Grep: '🔍',
  Bash: '▶️', WebFetch: '🌐', WebSearch: '🌐', TodoWrite: '📋',
};

export default function ToolChip({ tool }: { tool: ToolPart }) {
  const icon = ICONS[tool.name] ?? '🔧';
  const state = tool.state;
  const border =
    state === 'running' ? 'border-indigo-500/60' :
    state === 'ok'      ? 'border-emerald-500/40' :
                          'border-rose-500/60';
  return (
    <div className={`inline-flex items-center gap-2 rounded-md border ${border} bg-neutral-900 px-2 py-1 text-xs`}>
      <span aria-hidden>{icon}</span>
      <span className="font-medium text-neutral-200">{tool.name}</span>
      {tool.target && <span className="truncate font-mono text-neutral-400 max-w-[200px]">{tool.target}</span>}
      {state === 'running' && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" aria-label="running" />}
      {state === 'ok' && <span aria-label="done">✓</span>}
      {state === 'err' && <span aria-label="failed">✕</span>}
    </div>
  );
}
```

### `template/components/Composer.tsx`

Textarea + send. Enter sends (Shift+Enter newlines). While running, shows "Stop" instead of "Send".

```tsx
'use client';
import { useState, useRef, FormEvent, KeyboardEvent } from 'react';

interface Props {
  disabled?: boolean;
  running: boolean;
  onSend: (prompt: string) => void;
  onStop: () => void;
}

export default function Composer({ disabled, running, onSend, onStop }: Props) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || running || disabled) return;
    onSend(v);
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <form onSubmit={submit} className="border-t border-neutral-800 p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={disabled ? 'Install Claude Code to chat…' : 'Describe what to build…'}
          rows={2}
          disabled={disabled}
          className="flex-1 resize-none rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        {running ? (
          <button type="button" onClick={onStop}
            className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500">
            Stop
          </button>
        ) : (
          <button type="submit" disabled={disabled || !text.trim()}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">
            Send
          </button>
        )}
      </div>
    </form>
  );
}
```

### `template/components/HealthBanner.tsx`

```tsx
export default function HealthBanner({ hint }: { hint?: string }) {
  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
      <p className="font-semibold">Claude Code CLI not found</p>
      <p className="mt-1 text-amber-200/80">{hint ?? 'Install and log in, then reload this page.'}</p>
    </div>
  );
}
```

## The client hook — `template/lib/use-agent-stream.ts`

Owns conversation state and the streaming fetch. The server sends `AgentEvent`s; this hook converts them into `ChatMessage`s the UI renders.

### Types

```ts
export type ToolState = 'running' | 'ok' | 'err';

export interface TextPart { kind: 'text'; text: string; }
export interface ToolPart {
  kind: 'tool';
  id: string;
  name: string;
  target?: string;
  state: ToolState;
  summary?: string;
}
export type MessagePart = TextPart | ToolPart;

export interface ChatMessage {
  role: 'user' | 'assistant';
  text?: string;                // for user messages
  parts: MessagePart[];         // for assistant messages; empty for user
}
```

### Hook signature

```ts
export interface UseAgentStream {
  messages: ChatMessage[];
  running: boolean;
  sessionId?: string;
  send: (prompt: string) => Promise<void>;
  stop: () => void;
}

export function useAgentStream(): UseAgentStream;
```

### Implementation outline

```tsx
'use client';
import { useCallback, useRef, useState } from 'react';
import type { AgentEvent } from './agent-events';

export function useAgentStream(): UseAgentStream {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  }, []);

  const send = useCallback(async (prompt: string) => {
    if (running) return;
    const userMsg: ChatMessage = { role: 'user', text: prompt, parts: [] };
    const assistantMsg: ChatMessage = { role: 'assistant', parts: [] };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setRunning(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, sessionId }),
        signal: ctrl.signal,
      });
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // SSE frames are separated by \n\n. Each starts with "data: "
        let sep: number;
        while ((sep = buf.indexOf('\n\n')) !== -1) {
          const frame = buf.slice(0, sep);
          buf = buf.slice(sep + 2);
          const line = frame.startsWith('data: ') ? frame.slice(6) : frame;
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as AgentEvent;
            applyEvent(setMessages, setSessionId, ev);
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setMessages(prev => appendTextToLastAssistant(prev, `\n\n[error] ${(e as Error).message}`));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [running, sessionId]);

  return { messages, running, sessionId, send, stop };
}
```

### `applyEvent` — event → message mutations

```ts
function applyEvent(
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setSessionId: React.Dispatch<React.SetStateAction<string | undefined>>,
  ev: AgentEvent,
) {
  switch (ev.type) {
    case 'session':
      setSessionId(ev.sessionId);
      return;
    case 'text_delta':
      setMessages(prev => appendTextToLastAssistant(prev, ev.content));
      return;
    case 'tool_use':
      setMessages(prev => appendToolToLastAssistant(prev, {
        kind: 'tool',
        id: ev.id,
        name: ev.name,
        target: ev.target,
        state: 'running',
      }));
      return;
    case 'tool_result':
      setMessages(prev => updateToolState(prev, ev.id, ev.ok ? 'ok' : 'err', ev.summary));
      return;
    case 'message_end':
      return;
    case 'result':
      return; // could show total cost/duration as a footer
    case 'error':
      setMessages(prev => appendTextToLastAssistant(prev, `\n\n[error] ${ev.message}`));
      return;
  }
}
```

The three helpers (`appendTextToLastAssistant`, `appendToolToLastAssistant`, `updateToolState`) are pure — always clone the array and the last message.

### Streaming UX rule: consecutive text blocks merge

If the last `MessagePart` is `text`, append to its `text`. Otherwise push a new text part. Same logic keeps tool chips interleaved with the text flow in emission order.

## Transition detail

- Transition property: `width` with `duration-300 ease-out`.
- The inner `<div style={{ width: PANEL_WIDTH }}>` has a fixed width so its children don't reflow mid-animation.
- Outer `<aside>` animates 0 ↔ 420px. `overflow-hidden` clips content during transit.
- When open, the main pane gets `flex-1` so it fills the remaining width — truly pushing content, not overlaying.

## Accessibility

- `aria-hidden` on panel when closed.
- Toggle button has `aria-label`.
- Composer textarea is keyboard-focusable; Enter sends.
- Tool chip state changes are visual + icon; screen readers announce via `aria-label` on the status dot.

## What NOT to do

- Don't use a modal/drawer library. One file of Tailwind does this cleanly.
- Don't auto-open on every page load; persist `open` state in `localStorage` keyed `infinite-chat-open`. (Optional polish; fine to skip for MVP.)
- Don't store the transcript in localStorage for MVP — keep it in React state only. A reload clears it, which is fine because the user is watching their app change live anyway.
