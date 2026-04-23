# The Infinite App — Architecture

## What we're building

A Next.js starter template distributed as `npx nextjs-claw <dir>` that ships with a built-in AI coding agent. The user opens the generated app in a browser, sees a slide-out chat panel on the right, and tells it what to build ("make me a landing page", "add a pricing section"). The agent edits the app's own source files; Next.js hot reload makes the change appear live in the same browser. The app literally builds itself.

## The core design decision — subscription auth

We use the user's **Claude subscription** (their `claude login` OAuth token), not an Anthropic API key.

Anthropic's official `@anthropic-ai/claude-agent-sdk` (TypeScript) requires `ANTHROPIC_API_KEY` and explicitly forbids third-party apps from using subscription OAuth tokens in their TOS (as of April 2026). The `claude` CLI binary, however, transparently uses the logged-in subscription when invoked locally for personal use.

So the agent engine **spawns `claude` as a subprocess** with `--output-format stream-json`, parses its JSON stream, and forwards events to the browser as SSE. Zero Anthropic SDK dependency. The generated app's only requirement beyond Next.js is that the user has Claude Code CLI installed and logged in.

## Current state (what's already done)

- Repo scaffolded at `/Users/dennisonbertram/Develop/the-infinite-app/` ([commits `963b336`, `c959b04`](../../)).
- Published-package structure: root `package.json` is the `nextjs-claw` CLI; `template/` is the Next.js app that gets copied.
- `bin/create.js` implements the CLI (copy template, rename gitignore, update package name, git init).
- `template/` has a fresh Next.js 16 + React 19 + Tailwind v4 + TypeScript app. Deps pinned exactly. No SDK dependency.
- Smoke-tested: `node bin/create.js /tmp/nc-smoke-test` works.

## What's left to build

| Doc | File(s) to produce | Purpose |
|-----|--------------------|---------|
| [01-structure-and-distribution.md](./01-structure-and-distribution.md) | — (reference only) | Final tree, what belongs where |
| [02-agent-engine-and-protocol.md](./02-agent-engine-and-protocol.md) | `template/lib/agent-events.ts`, `template/lib/agent-engine.ts` | Spawn `claude`, translate stream-json → AgentEvent |
| [03-api-routes.md](./03-api-routes.md) | `template/app/api/agent/route.ts`, `template/app/api/agent/health/route.ts` | SSE endpoint + health check |
| [04-ui-chat-panel.md](./04-ui-chat-panel.md) | `template/components/AppShell.tsx`, `template/components/ChatPanel.tsx`, etc. | Slide-out panel that pushes content |
| [05-demo-page.md](./05-demo-page.md) | `template/app/page.tsx` (replace default) | The editable canvas |
| [06-build-plan-and-tests.md](./06-build-plan-and-tests.md) | — | Wave plan, file ownership, E2E test |
| [07-risks-and-open-questions.md](./07-risks-and-open-questions.md) | — | Things to verify at build time, gotchas |

## Prereqs for the implementer (Sonnet)

- Read `README.md` and this whole `docs/architecture/` tree before starting.
- Work in `/Users/dennisonbertram/Develop/the-infinite-app/template/`. The Next.js app lives there. Never touch root `package.json`, `bin/`, or `.npmignore` unless a doc explicitly says so.
- Follow [06-build-plan-and-tests.md](./06-build-plan-and-tests.md) for wave ordering. Some work is sequential, some parallel.
- Pin every npm dependency exactly (no `^`, no `~`) per the user's global CLAUDE.md.
- Use `bun install` / `bun dev` / `bun run build` in the template — that's the distribution target. If `bun` isn't available, note it and fall back to `npm`, but the README and CLI messaging is bun-first.
- **Before writing the engine, run `claude --help | head -80` and confirm the flag syntax matches what 02-agent-engine-and-protocol.md expects.** If it drifts, update the doc and then implement.

## Conventions

- TypeScript strict everywhere.
- No comments unless non-obvious "why". Names should do the explaining.
- Server code: Node runtime explicit (`export const runtime = 'nodejs'`).
- Client components: `'use client'` at top of file.
- Tailwind v4 (no `tailwind.config.ts`; uses `@theme` in `globals.css`). No extra UI libs for MVP — hand-roll with Tailwind.
- File paths in docs are always relative to the repo root.

## Non-goals (explicitly out of scope for MVP)

- Multi-user, auth, accounts
- Persisting conversations across server restarts
- Exposing an MCP server (SDK is client-only anyway)
- Publishing to npm (happens later)
- Deployment beyond local `bun dev`
- Telemetry / usage tracking
- Internationalization
- Dark/light theme toggle (use dark by default; Tailwind `dark:` utilities optional)

## Success criteria

A human clones the template via `npx nextjs-claw my-app`, runs `bun install && bun dev`, opens the URL, clicks the chat toggle, types "change the hero title to 'Hello, Claude'", and within 10 seconds sees the hero title change in-browser without a page reload. Tool use chips ("Editing app/page.tsx…") appear and complete in the chat. That's the MVP.
