# My Infinite App

This app was scaffolded with [nextjs-claw](https://github.com/dennisonbertram/nextjs-claw). It is a self-editing Next.js app — use the built-in chat panel to tell Claude what to build, and watch your source code update in real time.

## Getting started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Requirements

- [Bun](https://bun.sh)
- [Claude Code CLI](https://github.com/anthropics/claude-code), authenticated:
  ```bash
  npm i -g @anthropic-ai/claude-code
  claude login
  ```

The chat panel spawns `claude` as a subprocess using your Claude subscription — no API key needed.

## Tech stack

- [Next.js 16](https://nextjs.org)
- [React 19](https://react.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- TypeScript
