# 00 — Stack Overview & Design Philosophy

## What this gives you

A self-hosted, vendor-neutral full-stack foundation for apps built inside `nextjs-claw`. Every recipe in this directory targets a specific capability. The goal is that when a user says "add login" or "set up a database", the embedded Claude agent reads the matching recipe and executes it — no guessing, no hallucinated APIs, no SaaS lock-in.

## Design principle (non-negotiable)

**You own the stack.** No proprietary service is the default for anything that can be self-hosted at negligible cost. This means:

- Postgres, not Supabase or Neon
- Home-grown auth, not Clerk or Auth0
- SMTP, not Resend or SendGrid
- Redis or pg-boss, not Upstash or Inngest
- MinIO, not S3 or Cloudflare R2

npm packages are fine — this is not about zero dependencies. It is about avoiding services you cannot run yourself. Drizzle, Zod, argon2, nodemailer — all acceptable.

Every dep must be pinned exactly. Use `bun add -E <pkg>` (equivalent to `npm install --save-exact`). Never leave `^` or `~` in package.json.

## How the recipes relate

```
00-overview          ← you are here (conventions, dev services)
01-database          ← Postgres + Drizzle ORM (foundation for everything)
02-auth              ← sessions, passwords, OAuth (depends on 01)
03-email             ← nodemailer + SMTP (used by 02 for verification)
04-cache-and-sessions← Redis via ioredis (optional upgrade from pg sessions)
05-background-jobs   ← pg-boss workers (depends on 01)
06-file-uploads      ← disk dev / MinIO prod
07-realtime          ← SSE → WebSockets → LISTEN/NOTIFY
08-validation-forms  ← Zod + react-hook-form
09-logging           ← pino structured logs
10-rate-limiting     ← Postgres or Redis sliding window
11-security-headers  ← Next.js middleware, CSP, CSRF
12-payments          ← Stripe (unavoidable for money)
13-testing           ← Vitest + Playwright
14-deployment        ← Docker Compose prod + Caddy
15-agent-integration ← how the embedded agent uses this cookbook
```

## Canonical Docker Compose for dev services

Drop this file at the repo root (next to `template/`). It starts Postgres 16, Redis 7, MinIO, and Mailpit. All data is in named volumes so it survives `docker compose down`. Ports are chosen to avoid common conflicts.

```yaml
# docker-compose.dev.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:RELEASE.2024-11-07T00-52-20Z
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Web console
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

  mailpit:
    image: axllent/mailpit:v1.21.5
    restart: unless-stopped
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI (open http://localhost:8025)
    environment:
      MP_MAX_MESSAGES: 500
      MP_SMTP_AUTH_ACCEPT_ANY: 1
      MP_SMTP_AUTH_ALLOW_INSECURE: 1

volumes:
  pgdata:
  redisdata:
  miniodata:
```

Start all services:
```bash
docker compose -f docker-compose.dev.yml up -d
```

Stop (data preserved):
```bash
docker compose -f docker-compose.dev.yml down
```

Destroy including data:
```bash
docker compose -f docker-compose.dev.yml down -v
```

## Environment variable contract

Every recipe reads from these env vars. Set them in `.env.local` (gitignored). Never commit secrets.

```bash
# .env.local — copy from .env.example and fill in
# ─── Postgres ───────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://app:app@localhost:5432/app

# ─── Redis ──────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── SMTP ───────────────────────────────────────────────────────────────────
# Dev: Mailpit (catches all outgoing mail, no auth needed)
SMTP_URL=smtp://localhost:1025
# Prod: your SMTP credentials in URL form
# SMTP_URL=smtp://user:password@mail.example.com:587

# ─── S3 / MinIO ─────────────────────────────────────────────────────────────
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=uploads

# ─── Auth ────────────────────────────────────────────────────────────────────
SESSION_SECRET=change-me-to-at-least-32-random-bytes-in-production
# Generate with: openssl rand -base64 32

# OAuth (Google) — optional
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OAuth (GitHub) — optional
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# App base URL — used for OAuth redirects, email links
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Stripe ─────────────────────────────────────────────────────────────────
# Only needed if recipe 12 (payments) is used
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Provide an `.env.example` committed to the repo with all keys present but empty values.

## File placement convention

Inside `nextjs-claw`, user code lives under `app/preview/`. The agent creates:

- `app/preview/**` — pages, layouts, components the user requested
- `lib/**` — shared utilities (auth helpers, db client, email sender, etc.)
- `drizzle/**` — migrations and schema
- `public/**` — static assets

Infrastructure files (`app/layout.tsx`, `components/**`, `lib/agent-engine.ts`, etc.) are off-limits. See recipe 15 and the system prompt in `lib/agent-engine.ts`.

## Package manager

Use `bun` everywhere in this project. `bun add -E <pkg>` installs and pins exactly. If bun is not available, fall back to `npm install --save-exact`.

## Common pitfalls

- Never import server-only modules (`pg`, `ioredis`, `nodemailer`) in a Client Component. Move them to Server Components, API Route Handlers, or Server Actions.
- Next.js 16 App Router: all code is Server Components by default. Add `'use client'` only when browser APIs or interactivity are required.
- `DATABASE_URL` must include `sslmode=require` in production. Omit in local dev.
- Hot reload in Next.js dev mode creates multiple module instances. Database connection pools need singleton guards (see recipe 01).
