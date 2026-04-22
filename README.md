# nextjs-claw

A Next.js starter that builds itself. Chat with Claude inside the running app, and it edits its own source code and hot-reloads in real time.

## Usage

```bash
npx nextjs-claw my-app
cd my-app
bun install
bun dev
```

Then open [http://localhost:3000](http://localhost:3000) and start chatting.

## What you get

- Next.js 16 + React 19 + Tailwind CSS 4
- TypeScript, ESLint — all pre-configured
- An AI chat panel wired to the `claude` CLI subprocess
- The app edits its own source files and Next.js fast-refreshes them live

## Prerequisites

**Bun** — the package manager used by the generated app.
Install from [https://bun.sh](https://bun.sh).

**Claude Code CLI** — the AI engine that edits the source.
```bash
npm i -g @anthropic-ai/claude-code
claude login
```

The app calls `claude` as a subprocess and uses your existing Claude subscription. No API key is required.

## How it works

The chat panel in the generated app sends your instructions to the `claude` CLI, which has full access to the project files. Claude rewrites the source, Next.js hot-reloads, and you see the changes instantly.

## Options

```
npx nextjs-claw <directory>   # scaffold into <directory>
npx nextjs-claw .             # scaffold into current directory (must be empty)
npx nextjs-claw               # defaults to ./my-infinite-app
```

## License

MIT
