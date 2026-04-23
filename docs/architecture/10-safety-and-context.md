# 10 — Safety & Agent Context (Wave 4, Part 3 + 4)

Two small but critical changes to the engine's system prompt:

1. **Protected paths** — the agent refuses to edit our infrastructure, even when asked.
2. **Project context primer** — a short tree + file-role map so the agent doesn't grep around figuring out where things live.

Both are string changes inside `template/lib/agent-engine.ts`. No new files, no new deps.

## Protected paths

The agent cannot edit:

- `app/layout.tsx` — our root layout
- `app/page.tsx` — our shell
- `app/shell.css` — chat styling
- `app/api/**` — our API routes (engine, health)
- `components/**` — every file in components/ is our infrastructure
- `lib/agent-*.ts`, `lib/use-agent-stream.ts`, `lib/react-source.ts` — agent engine + hooks
- `next.config.ts`, `tsconfig.json`, `package.json`, `eslint.config.mjs`, `postcss.config.mjs`, `bun.lock`, `package-lock.json`
- anything under `node_modules/`, `.next/`, `.git/`

The agent CAN edit:

- Everything under `app/preview/**` — the user's app
- New files the user asks to create (anywhere under `app/preview/` or new top-level user folders)

### MVP implementation: system prompt allowlist

For MVP we rely on the agent following instructions. Replace the existing system prompt in `agent-engine.ts` with:

```
You are an AI coding assistant embedded inside a running Next.js 16 app that a
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
- The user often includes "Referenced elements" at the top of their prompt —
  these are specific <h1>, <button>, etc. they clicked in the preview. Each has
  a file:line. When present, start with Read on that file, then Edit the exact
  lines. Do not scan the whole tree.
- Prefer Edit (old_string/new_string) over Write (full rewrite).
- The dev server auto-reloads on save. Your changes appear in the iframe within
  ~2 seconds. You don't need to restart anything.
- Keep changes scoped to what the user asked. Don't refactor unasked.
- If the user asks for a "theme" or "dark mode", edit app/preview/globals.css
  and/or app/preview/layout.tsx body classes — NEVER app/layout.tsx or
  app/shell.css.
```

This is in `agent-engine.ts`'s `SYSTEM_PROMPT` constant and gets passed via
`--append-system-prompt`. Keep it under ~1200 characters total — anything longer
dilutes the default prompt.

### Follow-up (post-MVP, out of scope for Wave 4): hard block via hook

Claude CLI supports PreToolUse hooks via `--settings <path>`. The hook is a shell script that receives the tool name and input on stdin and can return a block decision. A future wave can add `template/.claw/protect.json` as the settings file and `template/.claw/block-protected.sh` as the hook — rejects any Edit/Write whose `file_path` isn't under `app/preview/` or `public/`. For MVP, the system prompt is the gate.

## Project context primer (agent performance)

Without priming, the agent's first move is often `Glob '**/*.tsx'` → `Read layout.tsx` → `Read page.tsx` → `Read globals.css`. That's 4 turns before it starts actual work. Prime it once and most turns start at turn 2.

The primer is embedded in the same `SYSTEM_PROMPT` as above (continued):

```
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
```

Total footprint: ~1800 chars for protection + context combined. The `claude` CLI's stream-json init event already echoes the system prompt in `cache_creation_input_tokens` — after the first turn in a session the prompt is cached (5-min TTL) and costs ~0 on subsequent turns.

## Implementation checklist

Open `template/lib/agent-engine.ts` and:

1. Replace the `SYSTEM_PROMPT` constant with the combined block above.
2. Confirm it's still passed via `--append-system-prompt`.
3. Done. No other changes.

## Verify

Two quick tests from the app:

1. **Protection:** open the preview, type in chat "change the chat panel background to white". Agent should refuse with a message along the lines of "That's part of the app's infrastructure and can't be edited from here." It should NOT produce an Edit tool_use for `components/AppShell.tsx`.

2. **Context efficiency:** fresh session, prompt "change the hero heading to 'Hello'". Agent should go straight to `Read app/preview/page.tsx` → `Edit`. Should NOT Glob or Read `layout.tsx`, `globals.css`, `package.json`.

Measure turn count (from the `result` event's `turns` field). Expect ≤ 3 for the canonical heading-change prompt.

## Commit

`feat(safety): protected-path allowlist + project context in system prompt`

## Wave 4 build plan

Single wave, three commits in sequence. Sonnet can do all three back-to-back as one worker:

| Step | Doc | Commit prefix |
|------|-----|---------------|
| 1. Iframe isolation | 08 | `refactor(shell): …` |
| 2. Click-to-reference | 09 | `feat(picker): …` |
| 3. Safety + context | 10 | `feat(safety): …` |
| 4. E2E test + report | — | `docs: Wave 4 E2E verification report` |

Each step verified (build passes) before moving to the next. After step 3, do the full Wave 4 E2E:

- Background-to-white without touching chat
- Pick an element, reference it, Edit
- Attempt to edit protected file → refusal
- Measure turns on common prompts

Write `docs/testing/wave4-e2e.md` with results.

## Post-wave 4 backlog (NOT part of this wave)

- Hook-based hard block for protected paths (`.claw/protect.json` + shell script)
- Rate-limit the picker so rapid hovers don't trash performance (debounce `mousemove`)
- Persist references across hot reloads (currently cleared on HMR; fine)
- `claude login` auth detection in `/api/agent/health` (runs a tiny `claude -p "say hi" --max-turns 0` probe and reports "not logged in" if it 401s)
- Publish `nextjs-claw` to npm
