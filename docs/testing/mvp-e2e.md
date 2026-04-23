# MVP E2E Verification Report

**Date:** 2026-04-23  
**Wave:** 3 — End-to-end verification  
**Commits tested:**
- `1996e67` — feat(engine): subprocess engine + SSE API + health check  
- `3875043` — feat(ui): slide-out chat panel + streaming hook + empty-canvas demo  

**Dev server:** Next.js 16.2.4 (Turbopack) on port 65007  
**claude CLI:** 2.1.118 (Claude Code)  
**Tested by:** Claude Code (claude-sonnet-4-6)

---

## Step Results

| Step | Description | Expected | Actual | Result |
|------|-------------|----------|--------|--------|
| 1 | Free port + dev server health | `{"ok":true,"claudeVersion":"..."}` | `{"ok":true,"claudeVersion":"2.1.118 (Claude Code)"}` | ✅ |
| 2 | Baseline page HTML strings | 3 strings present | `Build this app`, `Describe me`, `I am an empty canvas` all found | ✅ |
| 3 | Snapshot page.tsx md5 | md5 recorded | `8a2dd4313a7a3825399945a419da452e` | ✅ |
| 4 | Send canonical prompt via API | SSE stream: session + tool_use/result + result ok:true, no auth errors | session event, 1 Read + 2 Edit tool calls, all ok:true, result ok:true, durationMs=17186 | ✅ |
| 5 | Verify file changed on disk | Hello, Claude (1), Nice to meet you (1), I am an empty canvas (0) | Exact match | ✅ |
| 6 | HMR serving updated HTML | `Hello, Claude` + `Nice to meet you` in HTML; old text absent | Both strings present; `I am an empty canvas` absent | ✅ |
| 7 | Multi-turn session resume | Agent reuses sessionId, changes subheading without re-explaining context | Same sessionId returned; went straight to Edit (no re-Read); durationMs=4863 | ✅ |
| 8 | Abort + subprocess cleanup | After killing curl, no `claude --permission-mode acceptEdits` zombie processes | Zero `acceptEdits` processes after kill+2s sleep | ✅ |
| 9 | Browser visual check | Hero shows updated text, chat panel visible, no console errors | Screenshot confirms "Hello, Claude." / "Ready to ship." h1/h2, "Build this app" panel open, no console errors | ✅ |
| 10 | Restore + shutdown | page.tsx reverted, git status clean (only expected files dirty) | page.tsx restored to template, only `template/next-env.d.ts` and `template/bun.lock` remain | ✅ |

**All 10 steps passed.**

---

## Key Stream Log Excerpts (Step 4)

```
data: {"type":"session","sessionId":"df45938e-a076-4449-b95e-07dd9a1c3266"}
data: {"type":"tool_use","id":"toolu_01RQV...","name":"Read","input":{"file_path":"...template/app/page.tsx"},"target":"...template/app/page.tsx"}
data: {"type":"tool_result","id":"toolu_01RQV...","ok":true,"summary":"1\t// template/app/page.tsx\n2\texport default function Home()..."}
data: {"type":"tool_use","id":"toolu_013Ht...","name":"Edit","input":{"old_string":"          I am an empty canvas.","new_string":"          Hello, Claude."},"target":"...template/app/page.tsx"}
data: {"type":"tool_result","id":"toolu_013Ht...","ok":true,"summary":"The file ...page.tsx has been updated successfully."}
data: {"type":"tool_use","id":"toolu_01KLK...","name":"Edit","input":{"old_string":"          Describe me.","new_string":"          Nice to meet you."},"target":"...template/app/page.tsx"}
data: {"type":"tool_result","id":"toolu_01KLK...","ok":true,"summary":"The file ...page.tsx has been updated successfully."}
data: {"type":"text_delta","content":"Updated both lines in `app/page.tsx:10` and `app/page.tsx:13`. No other changes."}
data: {"type":"result","ok":true,"turns":4,"durationMs":17186,"costUsd":0.198,"sessionId":"df45938e-a076-4449-b95e-07dd9a1c3266"}
```

No `authentication_failed`, no `Invalid API key`. Auth via `claude login` subscription token confirmed working.

---

## Sanity Metrics

| Metric | Value |
|--------|-------|
| Prompt → file change (Turn 1) | ~17.2s (durationMs from result event) |
| Prompt → file change (Turn 2, session resume) | ~4.9s (durationMs from result event) |
| File change → HMR compilation (Turbopack) | ~15–24ms (from dev server logs) |
| File change → new HTML served (incl. curl) | ~2–3s (wait + curl roundtrip in test) |
| Turn 1 tool calls | 1 Read + 2 Edit (4 total turns in claude) |
| Turn 2 tool calls | 1 Edit only (2 total turns — no re-Read needed, context reused) |

The faster Turn 2 (4.9s vs 17.2s) demonstrates session context working: the agent skipped re-reading the file because it remembered the content from Turn 1.

---

## What This Proves

1. **The subscription-auth subprocess pipeline is end-to-end functional.** The `claude` CLI spawned by Next.js route uses the logged-in user's subscription token transparently — no `ANTHROPIC_API_KEY` env required, no auth errors.

2. **Hot reload is seamless.** Turbopack compiles file changes in ~15ms. From a user's perspective, the browser shows updated content within 2–3 seconds of the agent completing its Edit tool calls — no manual reload required.

3. **Multi-turn sessions work.** The `--resume <sessionId>` flag allows the second prompt to skip redundant context-gathering (no re-Read of page.tsx), cutting latency from ~17s to ~5s and demonstrating that conversational state is preserved across API calls.

---

## Bugs Discovered

### BUG-01: `next-env.d.ts` mutated by dev run (minor, cosmetic)

**Description:** Running `bun dev` causes Next.js to rewrite `template/next-env.d.ts`, changing the import path from `.next/types/routes.d.ts` to `.next/dev/types/routes.d.ts`.

**Reproduction:**
```sh
git status template/next-env.d.ts   # clean
cd template && bun dev &
sleep 5
git diff template/next-env.d.ts     # shows the path change
```

**Severity:** Low. This file is auto-generated by Next.js and the comment inside says "This file should not be edited." The change is benign (pointing to the dev build output directory) but adds noise to `git status`. Workaround: add `template/next-env.d.ts` to `.gitignore` or document that it gets regenerated.

**Impact:** None functional. Does not affect build, runtime, or user experience.

---

### BUG-02: Turbopack workspace root warning (cosmetic)

**Description:** Dev server emits a warning:
```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected the directory of /Users/.../pnpm-lock.yaml as the root directory.
To silence this warning, set `turbopack.root` in your Next.js config...
```

**Reproduction:** Run `bun dev` from within `template/` on a machine that has another lockfile higher in the directory tree.

**Severity:** Low/cosmetic. The warning fires because of the user's monorepo environment — the template itself is fine. End users creating a fresh project from the template won't have this issue.

**Mitigation:** Add `turbopack: { root: '.' }` to `next.config.ts` to silence this for the template directory itself.

---

## Known Limitations Observed

- **Abort timing window:** The abort test waited 3 seconds before killing curl. If a longer wait is used, the agent may complete the task before being killed — the abort test is somewhat timing-sensitive. The signal propagation mechanism is correctly implemented; the window is just narrow for fast prompts.

- **HMR is SSR-side only for this curl test.** The "HMR" validated in Step 6 is the server re-rendering the updated page on a new HTTP GET. The WebSocket-based client-side HMR (where the browser auto-refreshes without a reload) is confirmed visually in Step 9 via the browser screenshot showing "Ready to ship." already rendered from the Step 7 agent run.

- **Cost tracking present but not surfaced in UI.** The `result` event includes `costUsd` (e.g., `0.198`). The UI currently ignores this field per the MVP decision not to show cost. This works as-designed; flagged here for awareness.

- **Turbopack dev-only.** `bun run build` uses the standard Next.js compiler, not Turbopack. Production builds are unaffected.

---

## Screenshot

Browser screenshot path: `docs/testing/wave3-browser-screenshot.png`

Confirms at the time of capture (after Steps 4–7):
- H1: "Hello, Claude."
- H2: "Ready to ship."
- Chat panel visible on the right, "Build this app" header, composer input with placeholder "Describe what to build…"
- No console errors
