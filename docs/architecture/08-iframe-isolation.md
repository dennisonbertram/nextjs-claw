# 08 — Iframe Isolation (Wave 4, Part 1)

## Why this exists

In the MVP, chat and user-app share one HTML document. Globals.css, layout.tsx, body classes all cascade across both. Observed in practice: the user asked the agent "make background white", it dutifully edited `globals.css`, `layout.tsx`, and then **also edited `components/AppShell.tsx` (the chat shell)** because the chat was still visibly dark. The agent had no way to know the chat is infrastructure.

Fix: put the user's app in an **iframe**. The iframe loads a separate top-level route (`/preview`) which is its own browser document — its own `<html>`, `<body>`, CSS stylesheet chain. The outer document (`/`) renders the chat and nothing else from the user's code. Two documents, zero CSS leak, zero agent confusion about "which h1 did you mean".

## Target tree

```
template/
├── app/
│   ├── layout.tsx                 # OUR minimal root layout (html + body, no style)
│   ├── page.tsx                   # OUR shell at / — renders <AppShell><PreviewFrame/></AppShell>
│   ├── shell.css                  # OUR scoped chat styles (imported from AppShell.tsx)
│   ├── api/agent/…                # OUR API (unchanged)
│   └── preview/
│       ├── layout.tsx             # USER's layout (owns html/body for the iframe doc)
│       ├── page.tsx               # USER's page (moved from old app/page.tsx)
│       └── globals.css            # USER's style entry (imported only by preview/layout)
├── components/
│   ├── AppShell.tsx               # MODIFIED: renders PreviewFrame + ChatPanel
│   ├── PreviewFrame.tsx           # NEW: the iframe + postMessage bridge
│   ├── PickBridge.tsx             # NEW (used by doc 09 — mentioned here because preview/layout references it)
│   └── … (rest unchanged)
└── lib/
    └── … (unchanged)
```

## How Next.js routing handles this

Next.js App Router uses **nested layouts**, not nested documents. By default, `/` and `/preview` share `app/layout.tsx`. We keep that shared layout **minimal** — it does nothing but render `{children}`:

```tsx
// app/layout.tsx (ours, keep tiny)
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Infinite App',
  description: 'A Next.js app that builds itself.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

No `className` on `<body>`. No global CSS import. Two things live underneath it:

- `app/page.tsx` — the shell, renders `<AppShell>` which imports `shell.css`
- `app/preview/*` — the iframed user app, imports its own `globals.css`

Because `shell.css` and `preview/globals.css` are CSS imports from *different parts of the tree*, Next.js emits them into the respective routes' `<head>`. When the iframe requests `/preview`, the server sends an HTML doc with `preview/globals.css` only; when the browser requests `/`, the HTML doc has `shell.css` only. (Next.js has supported scoped CSS imports from non-root layouts/components since the App Router stabilized.)

If a build-time issue appears (e.g., "global CSS can only be imported from root layout"), fall back to **CSS Modules** for `shell.css` (import it as `styles` in `AppShell.tsx` and use `styles.root` etc.). The isolation still holds.

## Shell — `app/page.tsx`

```tsx
// app/page.tsx — OUR shell
import AppShell from '@/components/AppShell';
import PreviewFrame from '@/components/PreviewFrame';

export default function Shell() {
  return (
    <AppShell>
      <PreviewFrame src="/preview" />
    </AppShell>
  );
}
```

## Shell CSS — `app/shell.css`

Create new file. Contents of current `globals.css` (Tailwind import + our chat dark theme), but **scoped to a root element**:

```css
@import "tailwindcss";

@theme {
  --font-sans: ui-sans-serif, system-ui, sans-serif;
}

html, body { height: 100%; margin: 0; }
body { background: #0a0a0a; color: #f5f5f5; font-family: var(--font-sans); }
```

Import from `components/AppShell.tsx` (top of file):

```tsx
'use client';
import '@/app/shell.css';
```

## PreviewFrame — `components/PreviewFrame.tsx`

```tsx
'use client';
import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  onMessage?: (data: unknown) => void;
}

export default function PreviewFrame({ src, onMessage }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!onMessage) return;
    const handler = (e: MessageEvent) => {
      if (ref.current && e.source === ref.current.contentWindow) {
        onMessage(e.data);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  return (
    <iframe
      ref={ref}
      src={src}
      className="h-full w-full border-0 bg-white"
      title="App preview"
      // sandbox intentionally OMITTED — we want full same-origin script execution
      // (it's our own origin anyway, plus picker needs full DOM access)
    />
  );
}
```

The iframe sits in the main flex column of `AppShell`, taking all space not used by the chat panel. When the iframe is same-origin (it always is — both /  and /preview are served by the same dev server), scripts inside have full DOM access and can postMessage freely. No sandbox needed.

## AppShell changes

Current `components/AppShell.tsx` renders `{children}` in the left pane. Update to:

- import `@/app/shell.css` at the top
- accept `children` still (so the shell can contain anything, including the iframe)
- keep the chat panel on the right as-is
- add `data-claw-shell` to the outermost wrapper so CSS scoping can target it if needed

Do NOT change the chat panel logic (messages, SSE, etc.) in this part — that stays. Just the layout container and the CSS import source.

## USER's preview — `app/preview/layout.tsx`

This is the **only part the user/agent should edit freely**. Intentionally simple so the agent's first "make it white" just works:

```tsx
// app/preview/layout.tsx — USER TERRITORY
import './globals.css';
import PickBridge from '@/components/PickBridge';

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PickBridge />
      </body>
    </html>
  );
}
```

> **Infrastructure note (include as a comment in the file):** The `<PickBridge />` import powers the click-to-reference feature. If the agent removes it, click-to-reference silently breaks. The system prompt (see doc 10) explicitly forbids removing this import.

## USER's preview globals — `app/preview/globals.css`

```css
@import "tailwindcss";

@theme {
  --font-sans: ui-sans-serif, system-ui, sans-serif;
}

html, body { height: 100%; margin: 0; font-family: var(--font-sans); }
body { background: #0a0a0a; color: #f5f5f5; }
```

Same content as the old `app/globals.css`. But now it's *only* loaded by the iframe's document. The agent can edit this file freely; the chat is unaffected.

## USER's page — `app/preview/page.tsx`

Move the **entire contents** of the current `app/page.tsx` here, unchanged. One edit: the opening text should subtly acknowledge the iframe context, e.g. drop "Open the chat panel on the right" since the chat is now in the *parent* document. Keep it simple:

```tsx
// app/preview/page.tsx
export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <section className="text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
          The Infinite App
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          I am an empty canvas.
        </h1>
        <h2 className="mt-2 text-2xl font-medium text-neutral-400 sm:text-3xl">
          Describe me.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-400">
          Describe what you want in the chat, or click an element here and reference it directly.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a href="#" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500">
            Get started
          </a>
          <a href="https://github.com/anthropics/claude-code" className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800">
            Claude Code
          </a>
        </div>
      </section>

      <section className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile title="Ask for anything" body="Landing pages, dashboards, forms, widgets — describe it in plain English." />
        <Tile title="Point and edit" body="Click an element in this preview to reference it in your next message." />
        <Tile title="Your subscription" body="Uses your Claude Code CLI login. No API key configuration needed." />
      </section>
    </div>
  );
}

function Tile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-neutral-400">{body}</p>
    </div>
  );
}
```

## Delete the old `app/globals.css` and `app/page.tsx`

After moving content, delete these files from their old locations — the new homes are `app/shell.css` and `app/preview/page.tsx`. The old `app/layout.tsx` becomes the new minimal one.

## Chat layout shift

`AppShell.tsx` currently renders `{children}` as the left flex item (flex-1) and the chat panel as the right aside. With `{children}` now being an iframe, give it `className="h-full w-full"` so it fills the left pane. Remove any `overflow-auto` on `<main>` — the iframe scrolls internally. Exact change:

```tsx
// components/AppShell.tsx, inside the return
<main className="relative min-w-0 flex-1 bg-white">
  {children}
  {!open && (
    <button onClick={toggle} aria-label="Open chat" className="…">✨ Chat</button>
  )}
</main>
```

`bg-white` on `<main>` is a fallback — avoids a flash of dark before iframe loads. Anything is fine.

## The minimal root layout's job

`app/layout.tsx` is intentionally neutered. It exists only to satisfy Next.js's "every app needs a root layout" rule. No CSS, no classes, no metadata worth customizing (we keep title/description because those apply to the shell page). If the agent is told not to touch it (doc 10), it won't.

## Verify after implementing

1. `bun run build` — both routes compile.
2. `bun dev`:
   - `/` serves the shell: chat panel + iframe pointing to /preview
   - `/preview` serves the user app with its own dark background
3. **The CSS leak test**: ask the agent "change the background to white". It should:
   - Edit only `app/preview/globals.css` or `app/preview/layout.tsx`
   - The iframe turns white
   - The chat stays dark
4. **The protection test** (requires doc 10 applied): ask the agent "change the chat panel background to white". It should refuse.

## Gotchas

- Next.js dev HMR connects the iframe to its own HMR client. When the agent edits `app/preview/page.tsx`, the iframe refreshes. The parent (chat) is untouched.
- If the user navigates inside the iframe (e.g. clicks a link to `/preview/about`), the parent URL stays `/`. That's fine. The chat is always available.
- Iframe scroll: body overflow in preview should be `auto`. The iframe itself should NOT have `scrolling="no"`.
- `data-claw-shell` attribute on shell root lets the picker inside the iframe refuse to pick elements that belong to the parent (via `window.top` check, not the attribute — attribute is belt-and-braces).
- **Focus management**: clicking into the iframe shifts focus away from the composer. Not a bug, just a note. If it feels bad in testing, capture `window` focus events and refocus the composer after a pick.

## Commit

`refactor(shell): iframe isolation — user app at /preview, chat at /`
