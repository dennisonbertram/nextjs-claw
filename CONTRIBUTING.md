# Contributing to nextjs-claw

Thanks for considering contributing! `nextjs-claw` is **MIT-licensed open source** — fork it, modify it, ship it.

## Repository layout

```
.
├── bin/create.js          # the npx CLI (zero dependencies)
├── template/              # Next.js 16 app that gets scaffolded into user projects
│   ├── app/               # /api routes + chat shell + /preview iframe
│   ├── components/        # ChatPanel, SettingsPanel, PickBridge, etc.
│   └── lib/               # agent-engine.ts (claude subprocess), agent-events.ts, etc.
├── docs/
│   ├── architecture/      # design specs (read these first for big changes)
│   ├── stack/             # 16-recipe self-hosted cookbook (Postgres, auth, jobs…)
│   └── templates/         # 12 visual starter recipes (SaaS landing, dashboard…)
├── site/                  # the marketing landing page
└── package.json           # the published "nextjs-claw" CLI package
```

## Running locally

```sh
# Clone
git clone https://github.com/dennisonbertram/nextjs-claw
cd nextjs-claw

# Smoke-test the CLI (scaffolds a fresh app into ./tmp-app)
node bin/create.js tmp-app

# Iterate on the template directly
cd template
bun install
bun dev   # opens at http://localhost:3000
```

You'll need:
- **Bun ≥ 1.1** (or fall back to `npm install` / `npm run dev`)
- **Claude Code CLI** authenticated: `npm i -g @anthropic-ai/claude-code && claude login`
  (or set `ANTHROPIC_API_KEY` for API-key mode, or use one of the third-party providers in Settings)

## Pull request flow

1. **Open an issue first** for anything bigger than a typo. Saves both of us time if the design doesn't fit.
2. **One concern per PR.** Easier to review and revert.
3. **Tests / verification**: there's no automated suite yet. For UI changes, attach a before/after screenshot. For engine changes, paste a `curl -N` smoke test of `/api/agent` showing the SSE stream.
4. **Pin npm deps exactly.** No `^` or `~`. Use `bun add -E <pkg>` or edit `package.json` manually. Supply chain hygiene.
5. **Commit messages**: `<type>(<scope>): <summary>` — e.g. `feat(settings): add Z.ai provider`. Types: feat / fix / refactor / docs / chore / test.

## What's wanted

- **Bug fixes** — the engine, picker, and snap states all have known sharp edges (see `docs/architecture/07-risks-and-open-questions.md`).
- **New providers** in Settings — Bedrock, Vertex, OpenRouter native, etc.
- **More cookbook recipes** under `docs/stack/` — strict open-source / self-hosted preferred, no proprietary SaaS lock-in.
- **More template recipes** under `docs/templates/` — anything visually striking that demos well at thumbnail size.

## What's NOT wanted

- Refactors of working code "for cleanliness" without a concrete bug or feature attached.
- New runtime dependencies in the **CLI** package (root `package.json`) — it must stay zero-dep.
- Adding telemetry, analytics, or "phone home" code.
- Anything that breaks the local-only, subscription-friendly default.

## License

By contributing, you agree your changes are released under the [MIT License](./LICENSE) — same as the rest of the project.
