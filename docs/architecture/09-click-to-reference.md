# 09 — Click-to-Reference Picker (Wave 4, Part 2)

Builds on doc 08 (iframe isolation). The iframe at `/preview` includes a client-side picker. Users click an element in the preview → chip appears in chat composer → prompt is sent with structured context → agent edits the exact file and line.

## UX flow

1. User clicks **Pick element** button in chat panel header (or presses `P`).
2. Cursor becomes crosshair. Hover outlines elements in preview iframe with a pulsing indigo border.
3. User clicks. A chip drops into the composer: `<h1> "Hello, Claude." · app/preview/page.tsx:10`.
4. Pick mode stays active. User can click more elements → more chips. Escape exits pick mode.
5. User types "make these bigger" and hits Send.
6. Agent receives a prompt with a prepended `[Referenced elements: …]` block. It Reads and Edits precisely.
7. After sending, references are cleared.

## Architecture — how the picker reaches the iframe

The iframe is same-origin. Its DOM is fully inspectable by the parent, and it can post messages freely. We use a small client component (`<PickBridge/>`) rendered inside the iframe's layout; the parent sends commands via postMessage and receives picks.

Messages (parent ⇄ iframe):

| Direction | Type | Payload |
|-----------|------|---------|
| parent → iframe | `{ kind: 'claw/pick-mode', active: boolean }` | toggle pick overlay |
| iframe → parent | `{ kind: 'claw/pick', ref: ElementRef }` | user picked an element |
| iframe → parent | `{ kind: 'claw/ready' }` | bridge mounted; parent responds with current state |

Origin-check in both directions (`e.origin === window.location.origin`). Ignore other messages.

## Files

### New

- `template/lib/react-source.ts` — Fiber traversal utilities
- `template/components/PickBridge.tsx` — client component mounted inside preview iframe; owns the overlay + click handler
- `template/components/ReferenceChip.tsx` — small chip UI for composer

### Modified

- `template/components/AppShell.tsx` — state for `pickMode` and `references`; postMessage to iframe; receives picks
- `template/components/PreviewFrame.tsx` — add `postMessage` method (via ref) so AppShell can command the iframe
- `template/components/ChatPanel.tsx` — new header button "Pick element"
- `template/components/Composer.tsx` — render reference chips above textarea; send() forwards references
- `template/lib/use-agent-stream.ts` — `send(prompt, references?)` signature change
- `template/app/api/agent/route.ts` — accept `references` in request body; format into prompt text

### Unchanged

- `lib/agent-events.ts` — no new event types needed (tool_use chips already cover what the agent does)
- `lib/agent-engine.ts` — no change (we preprocess the prompt on the server before passing to runAgent)

## Types

Add to `template/lib/react-source.ts`:

```ts
export interface ElementRef {
  id: string;              // client-generated UUID for list keying
  fileName: string;        // project-relative, e.g. "app/preview/page.tsx"
  lineNumber: number;
  columnNumber: number;
  componentName: string;   // nearest owner component, e.g. "Home" or "Tile"
  tagName: string;         // upper-case, "H1" / "BUTTON"
  textSnippet: string;     // first ~80 chars of innerText, trimmed
  cssPath: string;         // short selector, e.g. "section > h1"
}
```

## Fiber walker — `template/lib/react-source.ts`

Everything here runs client-side, inside the iframe. React Fiber is a private API but stable enough for devtools-style features across React 18 and 19. Works under Next.js 16 + Turbopack because SWC's JSX transform injects `__source` on all JSX elements in dev (`process.env.NODE_ENV !== 'production'`). Production builds have no `_debugSource` — picker is a no-op then, which is fine.

```ts
export interface ElementRef { /* as above */ }

// ─── public API ────────────────────────────────────────────────────────────

export function getElementRef(el: Element, projectRoot: string): ElementRef | null {
  const fiber = getFiber(el);
  if (!fiber) return null;

  const debug = findDebugSource(fiber);
  if (!debug) return null;

  return {
    id: crypto.randomUUID(),
    fileName: makeRelative(debug.fileName, projectRoot),
    lineNumber: debug.lineNumber,
    columnNumber: debug.columnNumber ?? 0,
    componentName: findOwnerName(fiber) ?? 'Unknown',
    tagName: el.tagName,
    textSnippet: ((el as HTMLElement).innerText ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
    cssPath: buildCssPath(el),
  };
}

// ─── internals ─────────────────────────────────────────────────────────────

interface MinimalFiber {
  _debugSource?: { fileName: string; lineNumber: number; columnNumber?: number };
  _debugOwner?: MinimalFiber;
  return?: MinimalFiber;
  elementType?: unknown;
  type?: unknown;
}

function getFiber(el: Element): MinimalFiber | null {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
  if (!key) return null;
  return (el as unknown as Record<string, MinimalFiber>)[key] ?? null;
}

function findDebugSource(fiber: MinimalFiber): MinimalFiber['_debugSource'] | null {
  let cur: MinimalFiber | undefined = fiber;
  while (cur) {
    if (cur._debugSource) return cur._debugSource;
    cur = cur._debugOwner ?? cur.return;
  }
  return null;
}

function findOwnerName(fiber: MinimalFiber): string | null {
  let cur: MinimalFiber | undefined = fiber;
  while (cur) {
    const t = cur.elementType ?? cur.type;
    const name = typeOfName(t);
    if (name && /^[A-Z]/.test(name)) return name;
    cur = cur._debugOwner ?? cur.return;
  }
  return null;
}

function typeOfName(t: unknown): string | null {
  if (!t) return null;
  if (typeof t === 'function') return (t as { displayName?: string; name?: string }).displayName ?? (t as { name?: string }).name ?? null;
  if (typeof t === 'object') return (t as { displayName?: string; name?: string }).displayName ?? null;
  return null;
}

function makeRelative(absolutePath: string, projectRoot: string): string {
  let p = absolutePath.replace(/\\/g, '/');
  let root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '');
  if (p.startsWith(root + '/')) return p.slice(root.length + 1);
  // Fallback: keep only from the last common app-ish segment
  const m = p.match(/\/((?:app|components|lib|public)\/.+)$/);
  return m ? m[1] : p;
}

function buildCssPath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  for (let i = 0; cur && cur !== document.body && i < 4; i++) {
    let seg = cur.tagName.toLowerCase();
    if (cur.id) { seg += `#${cur.id}`; }
    else if (typeof cur.className === 'string' && cur.className.trim()) {
      const first = cur.className.trim().split(/\s+/)[0];
      if (first) seg += `.${first}`;
    }
    parts.unshift(seg);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}
```

**Server provides `projectRoot`.** Extend `GET /api/agent/health` to return `projectRoot: process.cwd()`. `AppShell` fetches once on mount, passes to PickBridge via a startup postMessage.

## PickBridge — `template/components/PickBridge.tsx`

Runs inside the iframe (rendered by `app/preview/layout.tsx`). Listens for pick-mode toggles from parent; on click, extracts `ElementRef`, posts back.

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { getElementRef } from '@/lib/react-source';

export default function PickBridge() {
  const [active, setActive] = useState(false);
  const [projectRoot, setProjectRoot] = useState<string>('');
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── parent messages ──
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { kind?: string; active?: boolean; projectRoot?: string };
      if (data?.kind === 'claw/pick-mode') setActive(!!data.active);
      if (data?.kind === 'claw/init' && typeof data.projectRoot === 'string') setProjectRoot(data.projectRoot);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ kind: 'claw/ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // ── pick mode handlers ──
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const prevCursor = html.style.cursor;
    html.style.cursor = 'crosshair';

    const onMove = (e: MouseEvent) => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || !overlayRef.current) return;
      if (t === overlayRef.current || overlayRef.current.contains(t)) return;
      const rect = (t as HTMLElement).getBoundingClientRect();
      const o = overlayRef.current;
      o.style.left = rect.left + 'px';
      o.style.top = rect.top + 'px';
      o.style.width = rect.width + 'px';
      o.style.height = rect.height + 'px';
      o.style.display = 'block';
    };

    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (!t || t === overlayRef.current) return;
      const ref = getElementRef(t, projectRoot);
      if (ref) {
        window.parent.postMessage({ kind: 'claw/pick', ref }, window.location.origin);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.parent.postMessage({ kind: 'claw/pick-mode', active: false }, window.location.origin);
      }
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      html.style.cursor = prevCursor;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [active, projectRoot]);

  if (!active) return null;
  return (
    <div
      ref={overlayRef}
      aria-hidden
      style={{
        display: 'none',
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 2147483647,
        border: '2px solid #818cf8',
        background: 'rgba(99, 102, 241, 0.08)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
        transition: 'all 60ms ease-out',
      }}
    />
  );
}
```

Inline styles — intentional. The picker must survive whatever styles the user's app applies (including edits they'll make). No Tailwind class that could be purged; no CSS that the agent could overwrite.

## AppShell wiring

New state: `pickMode: boolean`, `references: ElementRef[]`. New ref: `iframeRef`.

- On mount, GET `/api/agent/health` → store `projectRoot`.
- When iframe posts `claw/ready`, parent responds with `{ kind: 'claw/init', projectRoot }`.
- When user toggles pick mode (button/Cmd+P), parent posts `{ kind: 'claw/pick-mode', active: <new value> }`.
- When iframe posts `claw/pick`, push `ref` into `references`. **Stay in pick mode** (user can pick more). Exit via Escape or by clicking Send.
- Clear `references` after `send()` resolves.

Expose `iframeRef.current?.contentWindow?.postMessage(...)` via `PreviewFrame`'s new `send(msg)` method or via a `ref` forwarded through.

Implementation pattern: use `React.forwardRef` on `PreviewFrame` to expose `{ send(msg: unknown): void }`.

## Composer changes

Props now include `references: ElementRef[]` and `onRemoveReference(id)`. Render chips above the textarea:

```tsx
{references.length > 0 && (
  <div className="mb-2 flex flex-wrap gap-1.5">
    {references.map(r => (
      <ReferenceChip key={r.id} refData={r} onRemove={() => onRemoveReference(r.id)} />
    ))}
  </div>
)}
```

On send, call `onSend(text, references)`. The chips disappear because AppShell clears the array.

## ReferenceChip — `template/components/ReferenceChip.tsx`

```tsx
'use client';
import type { ElementRef } from '@/lib/react-source';

export default function ReferenceChip({ refData, onRemove }: { refData: ElementRef; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200">
      <span className="font-semibold uppercase tracking-wide">&lt;{refData.tagName.toLowerCase()}&gt;</span>
      {refData.textSnippet && <span className="truncate max-w-[140px] italic">"{refData.textSnippet}"</span>}
      <span className="font-mono text-indigo-300/70">{refData.fileName}:{refData.lineNumber}</span>
      <button
        onClick={onRemove}
        aria-label="Remove reference"
        className="ml-1 rounded text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-100 px-1"
      >×</button>
    </span>
  );
}
```

## Pick toggle in ChatPanel header

```tsx
<header …>
  <div>
    <h2 …>Build this app</h2>
    <p …>…</p>
  </div>
  <div className="flex items-center gap-1">
    <button
      onClick={onTogglePick}
      aria-pressed={pickMode}
      aria-label="Toggle pick mode"
      className={`rounded p-1.5 text-xs hover:bg-neutral-800 ${pickMode ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40' : 'text-neutral-400'}`}
      title="Pick element (P)"
    >
      ⌖ Pick
    </button>
    <button onClick={onClose} aria-label="Close chat" className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100">✕</button>
  </div>
</header>
```

Keyboard shortcut: in AppShell, register `keydown` on `document` — if `e.key === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey && activeTag === 'body'`, toggle pick mode. Low priority; fine to skip for MVP.

## Hook change — `useAgentStream`

Signature becomes:

```ts
send(prompt: string, references?: ElementRef[]): Promise<void>
```

Body POST to `/api/agent` includes `references` when provided.

## Server — formatting references into the prompt

`app/api/agent/route.ts` accepts `references: ElementRef[] | undefined`. Before handing to `runAgent`, wrap the prompt:

```ts
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
```

Validate `references` shape defensively — each must be an object with a string `fileName`, positive integer `lineNumber`, etc. On malformed input, ignore (don't error out); the user still gets a response to their text prompt.

**Do not add structured references to the AgentEvent protocol.** They're input-only; the server uses them to synthesize a plain-text prompt. Agent's response is regular text + tool_use like always.

## Acceptance tests

Write `docs/testing/wave4-e2e.md` with the usual step table. Key checks:

1. `bun run build` passes.
2. Visit `/`. Chat panel visible; iframe visible with "I am an empty canvas." inside.
3. Agent: "change the background to white" → edits `app/preview/globals.css` or `app/preview/layout.tsx` only. Iframe turns white; chat stays dark.
4. Click **Pick element** → cursor is crosshair in iframe; hover highlights.
5. Click the `<h1>`. Chip appears in composer: `<h1> "I am an empty canvas." · app/preview/page.tsx:10`.
6. Pick another (e.g. the first tile's `<h3>`). Two chips.
7. Type "make both text red" and Send.
8. Watch agent Read + Edit the two specific lines. Tool chips fire.
9. After completion, both elements are red in the iframe. Chips cleared from composer.
10. Escape exits pick mode even without a pick.

## Gotchas

- **`_debugSource` only exists in dev builds.** In production, Fiber has no source info. Picker silently falls back to `null` from `getElementRef`. Document this; picker works only in `bun dev`. That's fine — our distribution target is dev mode.
- **HMR invalidates line numbers.** After the agent Edits a file, line numbers in old references may point to different lines. Minor; references are meant to be used immediately, not stored. Clear references after send() (already spec'd).
- **Server Components at the root of preview** still have Fiber (after hydration). If a pure server component renders a `<div>` with no client boundary, that div has fiber nodes from the hydration pass. Works in practice. If it doesn't for some element, fall back: user sees no chip, tries again on a nearby element.
- **Picker crosshair applies to entire iframe document.** Good — that's the whole area to pick from.
- **Don't let picker pick its own overlay.** Handled by the `t === overlayRef.current` check.
- **CSS specificity**: user's app styling can't override the inline styles on the overlay (inline styles have highest specificity short of `!important`).

## Commit

`feat(picker): click-to-reference element picker wired through iframe postMessage`
