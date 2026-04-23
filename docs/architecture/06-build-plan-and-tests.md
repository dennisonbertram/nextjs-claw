# 06 — Build Plan, Ownership, and Tests

This doc tells the implementer (Sonnet) how to sequence the work. Strict wave ordering so parallel workers don't trip over each other.

## Ownership rules

- **Only one writer per file.** Workers in the same wave must have disjoint file lists.
- Wave N must fully complete before wave N+1 starts.
- No worker may edit root `package.json`, root `bin/`, `.npmignore`, `.gitignore`, or `docs/` unless explicitly in their brief.
- No worker adds npm deps without updating `template/package.json` with **exactly pinned** versions and running `bun install` successfully.

## Pre-flight (run once, not a wave)

Before any waves:

```sh
cd /Users/dennisonbertram/Develop/the-infinite-app/template
claude --help | head -80           # confirm flag syntax matches doc 02
claude --version                   # record version
bun --version || echo "no bun"     # fallback to npm if missing
bun install                        # or npm install
bun run build                      # confirm clean baseline
```

If `claude --help` diverges from doc 02's flag table, update doc 02 before starting Wave 1. If `bun` is missing on the build machine, fall back to `npm` for installs/builds but keep the template's user-facing instructions bun-first.

## Wave 1 — Shared types + engine + API (sequential)

**One worker, one commit.** The engine is the keystone and needs to be written cohesively; splitting it would cause contract drift.

Files:
- `template/lib/agent-events.ts` — spec in doc 02
- `template/lib/agent-engine.ts` — spec in doc 02
- `template/app/api/agent/route.ts` — spec in doc 03
- `template/app/api/agent/health/route.ts` — spec in doc 03

Acceptance:
- TypeScript clean: `bun run build` passes
- Manual smoke (with dev server running, separate terminal):
  ```sh
  curl -N -X POST http://localhost:3000/api/agent \
    -H 'content-type: application/json' \
    -d '{"prompt":"Say hi in one word."}'
  ```
  Stream must produce at minimum a `session` event and either a `result` or a `text_delta` + `result`.
- `curl http://localhost:3000/api/agent/health` returns `{"ok":true,...}` on a machine with `claude` installed.

Commit: `feat(engine): subprocess engine + SSE API + health check`

## Wave 2 — UI and demo page (parallel, 2 workers)

These touch disjoint file sets.

### Worker 2A — Chat UI

Files (all new):
- `template/lib/use-agent-stream.ts`
- `template/components/AppShell.tsx`
- `template/components/ChatPanel.tsx`
- `template/components/MessageList.tsx`
- `template/components/MessageItem.tsx`
- `template/components/ToolChip.tsx`
- `template/components/Composer.tsx`
- `template/components/HealthBanner.tsx`

Also modifies:
- `template/app/layout.tsx` — wrap in `<AppShell>` (spec in doc 04)
- `template/app/globals.css` — Tailwind v4 `@import` + `@theme` (spec in doc 04)

Commit: `feat(ui): slide-out chat panel with streaming and tool chips`

### Worker 2B — Demo page

Files:
- `template/app/page.tsx` — replace default with the empty-canvas hero (spec in doc 05)
- Delete `template/app/page.module.css` if present

Commit: `feat(demo): empty-canvas landing page`

Acceptance (both workers, merged):
- `bun run build` passes
- `bun dev` boots and renders: dark background, centered hero "I am an empty canvas. Describe me.", chat panel open on the right

## Wave 3 — End-to-end verification

**One worker, no code changes (ideally).** If bugs are found, fix-forward in this wave with small commits.

Steps:
1. Find a free port:
   ```sh
   PORT=$(node -e "const n=require('net'); const s=n.createServer(); s.listen(0,()=>{console.log(s.address().port); s.close()})")
   ```
2. `PORT=$PORT bun dev` in a background process
3. Poll until healthy:
   ```sh
   until curl -fs "http://localhost:$PORT/api/agent/health" | grep -q '"ok":true'; do sleep 1; done
   ```
4. Open a browser via the project's browser automation tool (`agent-browser` per CLAUDE.md) to `http://localhost:$PORT`
5. Confirm visually: chat panel visible on right, hero present, no errors in console
6. Send the canonical prompt via the panel: *"Change the heading to 'Hello, Claude' and make the subheading say 'Nice to meet you.'"*
7. Observe:
   - Tool chips appear (`Read app/page.tsx`, `Edit app/page.tsx`)
   - Chips transition running → ok
   - After edit, `app/page.tsx` on disk contains `Hello, Claude`
   - Browser shows the new heading within 5 seconds without a manual reload
8. Send a follow-up: *"Now change the subheading to 'Ready to ship.'"* and confirm `sessionId` was reused (the `session` event in round 2 either matches round 1's session or a new session is created — either is acceptable, but multi-turn should not reset context)
9. Test abort: start a longer prompt ("Add a pricing section with three tiers…"), click Stop mid-run, confirm:
   - UI returns to idle
   - `claude` subprocess actually exited (`pgrep -a claude | grep -v 'claude login'` should return nothing)

Deliverable: a short markdown report at `docs/testing/mvp-e2e.md` with ✓/✗ for each step, any bugs filed, and final screenshots.

## Out-of-band: gitignore hygiene

During development, `template/node_modules/` and `template/.next/` will exist on disk. Top-level `.gitignore` already excludes them. Confirm with `git status` that no large directories are staged. If `bun.lockb` exists in `template/`, it's covered by `.npmignore`; whether to commit it to the template is a judgment call — **don't commit it** so the template works for both bun and npm users.

## Definition of Done for MVP

- All three waves complete
- `bun run build` passes in `template/`
- E2E script passes all steps
- `docs/testing/mvp-e2e.md` written with evidence
- Final commit on `main`: `docs: MVP e2e report`
- README updated if any user-facing instruction changed

## What's explicitly NOT part of MVP

- Publishing `nextjs-claw` to npm
- Auth, multi-user, database
- Persisting chat history
- Dark/light toggle
- MCP server export
- Rate limiting / cost display in UI
- Keyboard shortcut to toggle panel
- Drag-to-resize panel width
- Custom `model` selection

These go in `docs/backlog.md` if anyone asks — not required for the MVP commit.
