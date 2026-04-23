# 01 — Structure and Distribution

## Repo layout (final state after MVP)

```
/Users/dennisonbertram/Develop/the-infinite-app/
├── .git/
├── .gitignore                         # already exists
├── .npmignore                         # already exists
├── README.md                          # already exists — user-facing CLI readme
├── package.json                       # already exists — the "nextjs-claw" CLI package
├── bin/
│   └── create.js                      # already exists — scaffolding CLI
├── docs/
│   └── architecture/
│       ├── README.md
│       ├── 01-structure-and-distribution.md   ← you are here
│       ├── 02-agent-engine-and-protocol.md
│       ├── 03-api-routes.md
│       ├── 04-ui-chat-panel.md
│       ├── 05-demo-page.md
│       ├── 06-build-plan-and-tests.md
│       └── 07-risks-and-open-questions.md
└── template/                           # the Next.js app that gets copied
    ├── gitignore                       # renamed from .gitignore on copy (dotfile publish trick)
    ├── README.md                       # already exists
    ├── package.json                    # already exists — no SDK, deps pinned
    ├── tsconfig.json
    ├── next.config.ts
    ├── next-env.d.ts
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    ├── app/
    │   ├── layout.tsx                  # MODIFY: mount <AppShell>
    │   ├── page.tsx                    # REPLACE: editable demo canvas (see 05)
    │   ├── globals.css                 # MAY EDIT: Tailwind v4 @theme tokens
    │   ├── favicon.ico
    │   └── api/
    │       └── agent/
    │           ├── route.ts            # CREATE: POST — SSE stream (see 03)
    │           └── health/
    │               └── route.ts        # CREATE: GET — claude CLI presence
    ├── components/                     # CREATE directory
    │   ├── AppShell.tsx                # client wrapper; manages chat open state
    │   ├── ChatPanel.tsx               # the slide-out panel
    │   ├── MessageList.tsx
    │   ├── MessageItem.tsx
    │   ├── ToolChip.tsx
    │   ├── Composer.tsx                # textarea + send button
    │   └── HealthBanner.tsx            # shown if claude CLI not found
    ├── lib/                            # CREATE directory
    │   ├── agent-events.ts             # shared AgentEvent union
    │   ├── agent-engine.ts             # runAgent() — spawn claude subprocess
    │   └── use-agent-stream.ts         # client hook: fetch SSE → messages
    └── public/
        └── ... (existing SVG assets; leave alone)
```

## Template that ends up in the user's project

After `npx nextjs-claw my-app`, the user's `my-app/` has everything under `template/` (with `gitignore` renamed to `.gitignore` and `package.json` name field updated). `docs/architecture/` and the repo-root `package.json` / `bin/` do NOT ship to the user — they're dev-only for this repo.

## Dependencies

### Template (`template/package.json`)

Already pinned by scaffold. Expected shape:

```jsonc
{
  "name": "nextjs-claw-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "16.x",      // exact pin
    "react": "19.x",     // exact pin
    "react-dom": "19.x"
  },
  "devDependencies": {
    "typescript": "…",
    "@types/node": "…",
    "@types/react": "…",
    "@types/react-dom": "…",
    "tailwindcss": "…",
    "postcss": "…",
    "@tailwindcss/postcss": "…",
    "eslint": "…",
    "eslint-config-next": "…"
  }
}
```

**Do not add any Anthropic SDK package.** The engine uses only Node built-ins (`node:child_process`, `node:readline`, `node:path`, `node:fs`).

### CLI (root `package.json`)

Already correct. Zero runtime deps. Don't touch unless the doc says to.

## The CLI (`bin/create.js`) — already implemented

Behavior:
- `npx nextjs-claw <dir>` — scaffolds into `<dir>`; refuses if non-empty.
- `npx nextjs-claw .` — scaffolds into cwd if empty.
- Default `<dir>` = `my-infinite-app`.
- Copies `template/` recursively, excluding `node_modules`, `.next`, `.git`, `bun.lockb`, `package-lock.json`.
- Renames `gitignore` → `.gitignore` on copy.
- Sets `package.json` `name` to kebab-cased target dir name.
- Runs `git init` in target (silent if git missing).
- Prints friendly post-install: `cd <dir> && bun install && bun dev`, and prereq: install + log in to Claude Code CLI.

Do not modify unless a flag is added (e.g. `--version`, `--help` — future).

## Publishing (future, not MVP)

For reference only:
- `npm publish --access public` with `name: "nextjs-claw"` and correct `bin` / `files`.
- CI smoke test: clean container, `npx nextjs-claw test-app && cd test-app && bun install && bun run build`.
- Tag `v0.1.0` on GitHub once first dogfood works.

Not part of MVP. Don't set this up now.
