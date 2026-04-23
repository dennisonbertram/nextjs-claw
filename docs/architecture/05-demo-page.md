# 05 — Demo Page (the editable canvas)

Replace `template/app/page.tsx` with a friendly empty-canvas hero. This is the file the agent will edit first, so the first change must be visually unmistakable.

## Design goals

1. **Single-file, self-contained.** No imports beyond React so the agent can rewrite it without touching other files. (Components under `components/` exist only for the chat; the demo page is standalone.)
2. **Obvious what to edit.** Big H1, short paragraph, one CTA button. When the agent changes the H1 text or adds a section, the user sees it immediately.
3. **Non-prescriptive.** Don't style it so heavily that edits look weird next to it. Use neutral typography and enough whitespace that the agent's work has room to breathe.
4. **Whitespace-friendly to editor tools.** Indent with 2 spaces, no unusual formatting. Each section as a clear top-level JSX block so a `Read`+`Edit` pair works reliably.

## Full file content

```tsx
// template/app/page.tsx
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
          Open the chat panel on the right and tell Claude what to build. It will edit
          this page&apos;s source code directly. Save happens automatically, and this browser
          window hot-reloads the moment it does.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a
            href="#"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
          >
            Get started
          </a>
          <a
            href="https://github.com/anthropics/claude-code"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
          >
            Claude Code
          </a>
        </div>
      </section>

      <section className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile title="Ask for anything" body="Landing pages, dashboards, forms, widgets — describe it in plain English." />
        <Tile title="Watch it happen" body="Source edits stream in live. Tool calls show up in the chat as they run." />
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

## Delete

- `template/app/page.module.css` if the scaffold generated one — we use Tailwind, no CSS modules.
- Existing Next.js default page content (the `image.src` logo hero, "Deploy now" buttons) is fully replaced.

## Keep

- `template/public/*.svg` (default scaffold assets) — harmless, don't reference them from the new page, leave in place.
- `template/app/favicon.ico` — keep.
- `template/app/globals.css` — modified per 04 to add Tailwind v4 `@import` and `@theme` block. Don't duplicate base styles here.

## Verification

After writing:
- `bun run build` must succeed with zero errors.
- `bun dev` + open `http://localhost:3000` should show: "I am an empty canvas. Describe me." centered on a dark background, three tiles below, chat panel open on the right.

## First demo prompt for E2E

> "Change the heading to 'Hello, Claude' and make the subheading say 'Nice to meet you.'"

Agent should:
1. `Read` `app/page.tsx`
2. `Edit` the two h1/h2 text strings
3. Return with a short text reply

The browser hot-reloads within ~1 second of the file saving. If it doesn't, dev server isn't watching — check `next.config.ts` isn't excluding `app/`.
