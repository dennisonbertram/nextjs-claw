# 07 — Risks, Gotchas, and Open Questions

Read this before starting and keep it nearby while building.

## The load-bearing assumption

**The `claude` CLI, spawned as a subprocess from a Next.js route, will use the user's `claude login` subscription for auth and will return `stream-json` that matches doc 02's translation table.**

If any of that turns out to be false, the plan needs revision. The first order of business in Wave 1 is to run `claude --help` and a hand-crafted smoke test:

```sh
cd /tmp && mkdir claw-smoke && cd claw-smoke
claude -p "write a file called hi.txt containing the word hello" \
  --output-format stream-json \
  --verbose \
  --permission-mode acceptEdits \
  --add-dir .
```

Expected: stream of JSON lines ending in a `result` with `subtype: "success"` and `hi.txt` on disk. If this doesn't work, stop and escalate — do not try to paper over it in the engine. **This is the go/no-go smoke test for the whole design.**

## Known risks and mitigations

### R1: `claude` not on PATH in Next.js's env

Next.js dev server inherits the shell's PATH. On macOS with a GUI-launched terminal, the global npm bin (`~/.nvm/versions/node/*/bin/` or `/opt/homebrew/bin/`) is usually present. But if the dev server is launched from a different shell or a GUI app, PATH might be missing it.

**Mitigation:**
- Health check endpoint confirms.
- If users report "claude not found" despite it being installed, suggest `which claude` → symlink into `/usr/local/bin`.
- Don't try to discover claude via Node — PATH is the contract.

### R2: Hot reload kills the stream mid-agent-run

When the agent edits `app/page.tsx`, Next.js dev server re-compiles. If it decides to restart the server (rare for page edits, common for layout/api edits), the SSE connection drops mid-stream.

**Mitigation:**
- System prompt tells the agent to stay out of `app/api/agent/` and `app/layout.tsx` unless asked.
- Client UI gracefully renders partial state when the stream ends unexpectedly (final `error` event OR just `running=false` after reader EOF).
- `sessionId` returned from `session` event lets the user retry with `--resume` to continue the turn. (MVP reuses for subsequent prompts; recovering a half-finished turn is out of scope.)

### R3: Agent edits its own source (the engine, API route, or components)

Catastrophic if it happens — could lock itself out, corrupt the streaming code, etc.

**Mitigation:**
- System prompt explicitly forbids editing `app/api/agent/**`, `lib/agent-*.ts`, `components/ChatPanel.tsx`, `components/AppShell.tsx`, `next.config.ts`, `package.json`.
- If the agent ignores the prompt, `--permission-mode acceptEdits` still executes the edit. This is a known risk of the auto-accept mode.
- Future hardening: use `--permission-mode plan` or a custom permission tool to block edits to protected paths. **Out of scope for MVP** but write a `docs/hardening.md` stub noting this.

### R4: Dev server port conflict

MVP defaults to 3000. Per user's global CLAUDE.md: never assume a port is free.

**Mitigation:**
- The E2E test script discovers a free port via Node's `net.createServer().listen(0)`.
- The template's README suggests `bun dev -- -p 3100` as a fallback; `bin/create.js` can print this hint too (optional polish).

### R5: Tailwind v4 quirks

Next.js 16's scaffold uses Tailwind v4, which replaces `tailwind.config.ts` with `@theme` inside CSS. Some v3 tutorials won't apply.

**Mitigation:**
- Doc 04's `globals.css` snippet is v4-compliant.
- Don't add a `tailwind.config.ts` file — it's obsolete in v4.
- If any component uses v3-only utilities, fix inline; don't introduce a config file.

### R6: `bun` installed but pre-1.1 or misconfigured

Older bun versions don't understand workspace roots or some lockfile formats. Template pins deps exactly, which is bun-friendly.

**Mitigation:**
- Template README says "bun 1.1+".
- CLI post-install message can echo `bun --version` check as a hint (optional).
- If issues surface, fall back to `npm install` in the E2E script.

### R7: Claude CLI stream-json format drift

The stream-json shapes documented in doc 02 are based on current Jan 2026 knowledge. Anthropic has versioned this loosely.

**Mitigation:**
- Translator falls through unknown messages to `[]` (skip).
- `readJsonLines` silently skips non-JSON lines so plain-text log noise can't crash the parser.
- If a new block type ships, the UI treats it as a no-op until the translator is updated. No crash.

### R8: Subprocess piped stdout backpressure

Node's `spawn` with `stdio: 'pipe'` has a small OS pipe buffer. If the server-side for-await doesn't read fast enough, the subprocess can block. In practice, Claude's stream-json output is bounded by LLM token rate (~100 tokens/sec), far below pipe capacity. Not a real risk at MVP scale.

**Mitigation:** if CPU-bound on the Node side, add `setImmediate` yields in the translator. Not needed for MVP.

### R9: macOS keychain access for claude login token

When Next.js dev server is launched via `bun dev`, the subprocess inherits the user's TTY session. Keychain should just work. If it prompts for keychain access on first subprocess spawn, that's expected.

**Mitigation:** first-run smoke test catches this.

### R10: SSE through proxies

Not applicable to local dev. If users later deploy to Vercel/Cloudflare, SSE + 5-minute runtime may exceed platform limits. Out of scope for MVP (template is dev-only).

## Open questions (decide at build time, don't over-think now)

1. **Should the chat panel be open on first load?** Default: **yes**, so the affordance is visible. If it looks too pushy, flip to closed by default and make the toggle button bigger.
2. **Should we persist `open` state in localStorage?** Default: **no** for MVP. Easy to add later.
3. **What about markdown rendering in assistant text?** Default: **plain text** with `whitespace-pre-wrap` for MVP. Markdown rendering (code blocks, lists) is a v0.2 polish item.
4. **Should we show cost / duration from the `result` event?** Default: **no** — the claude subscription doesn't produce meaningful cost numbers. If it shows, skip rendering.
5. **Panel width (420px) — is that right?** Sanity-check in Wave 3 with a real viewport. If it feels cramped, bump to 440px. Desktop-first; no mobile layout for MVP.
6. **What if the agent uses `TodoWrite`?** Chip shows "📋 TodoWrite · 5 todos". Future polish: expand the chip into a live checklist. Out of scope.

## Logging

Keep stderr from the subprocess going to the Node server's stderr (don't suppress). The user running `bun dev` sees any claude-CLI diagnostics in the terminal. Don't surface stderr to the browser unless the process exits nonzero.

## Telemetry

None. The app is local. Don't add any tracking.

## A note on the agent's system prompt

Keep it short. The `claude` CLI ships with a very capable default system prompt already. Our `--append-system-prompt` adds app-specific context (cwd, main page path, rules). Anything longer than a few sentences dilutes the default's instructions. See doc 02 for the exact text.
