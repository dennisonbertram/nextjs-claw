# 15 — Agent Integration

## What this gives you

The meta-recipe. This document tells the embedded Claude agent (the one running inside `nextjs-claw` via `lib/agent-engine.ts`) how to use the stack cookbook. It includes: the capability → recipe map, the system prompt snippet to add, and the conventions the agent must follow when executing any recipe.

## The capability → recipe map

When a user says something, the agent matches it to a recipe and follows that recipe's instructions verbatim:

| User says... | Recipe | Key files to create |
|---|---|---|
| "add a database", "store data", "persist X" | `docs/stack/01-database.md` | `lib/db/index.ts`, `lib/db/schema.ts`, `drizzle.config.ts` |
| "add login", "add accounts", "add auth", "let users sign in" | `docs/stack/02-auth.md` | `lib/auth/*`, `app/preview/auth/*` |
| "send emails", "email verification", "forgot password" | `docs/stack/03-email.md` | `lib/email/*` |
| "add caching", "cache queries", "add Redis" | `docs/stack/04-cache-and-sessions.md` | `lib/cache/*` |
| "background jobs", "run async", "send emails in background", "add cron" | `docs/stack/05-background-jobs.md` | `lib/jobs/*`, `worker.ts` |
| "file uploads", "let users upload images/files", "upload to S3" | `docs/stack/06-file-uploads.md` | `lib/storage/*`, `app/preview/api/upload/*` |
| "realtime", "live updates", "push notifications", "WebSockets" | `docs/stack/07-realtime.md` | `lib/sse.ts`, `lib/db/listen.ts` |
| "add a form", "validate input", "form with validation" | `docs/stack/08-validation-and-forms.md` | `lib/validation/*` |
| "add logging", "log errors", "structured logs" | `docs/stack/09-logging-and-observability.md` | `lib/logger/*` |
| "rate limiting", "prevent abuse", "throttle" | `docs/stack/10-rate-limiting.md` | `lib/rate-limit/*` |
| "security headers", "CSRF", "harden the app" | `docs/stack/11-security-headers-and-csrf.md` | `middleware.ts` |
| "add payments", "add subscriptions", "charge for access" | `docs/stack/12-payments.md` | `lib/stripe/*`, `app/preview/api/stripe/*` |
| "add tests", "write tests", "unit tests", "E2E tests" | `docs/stack/13-testing.md` | `vitest.config.ts`, `tests/*` |
| "deploy", "production", "go live" | `docs/stack/14-deployment.md` | `Dockerfile`, `docker-compose.prod.yml`, `Caddyfile` |

## System prompt addition for `lib/agent-engine.ts`

**Do not apply this change yet** — this recipe is documentation-only. When the agent integration work is scheduled, add the following block to the `SYSTEM_PROMPT` constant in `template/lib/agent-engine.ts`:

```
═══ STACK COOKBOOK ═══
When the user requests a capability (database, auth, email, file uploads, payments, etc.),
read the matching recipe from docs/stack/ before writing any code.

Capability → recipe map:
  database/persist data  → docs/stack/01-database.md
  auth/login/signup      → docs/stack/02-auth.md
  email                  → docs/stack/03-email.md
  cache/Redis            → docs/stack/04-cache-and-sessions.md
  background jobs/cron   → docs/stack/05-background-jobs.md
  file uploads           → docs/stack/06-file-uploads.md
  realtime/WebSockets    → docs/stack/07-realtime.md
  forms/validation       → docs/stack/08-validation-and-forms.md
  logging                → docs/stack/09-logging-and-observability.md
  rate limiting          → docs/stack/10-rate-limiting.md
  security headers/CSRF  → docs/stack/11-security-headers-and-csrf.md
  payments/Stripe        → docs/stack/12-payments.md
  testing                → docs/stack/13-testing.md
  deployment             → docs/stack/14-deployment.md

Rules when executing a recipe:
1. Read the recipe first. Do not improvise a different approach.
2. Use the exact library choices from the recipe (Drizzle not Prisma, argon2 not bcrypt, etc.).
3. Pin all npm deps with --save-exact / bun add -E.
4. New user-territory files go under app/preview/ or new top-level dirs (lib/, drizzle/, tests/).
5. Never edit infrastructure files (app/layout.tsx, components/**, lib/agent-engine.ts, etc.).
6. Recipes that require Docker services (Postgres, Redis, MinIO, Mailpit) assume docker-compose.dev.yml is running. If not, tell the user: "Run: docker compose -f docker-compose.dev.yml up -d"
7. After creating lib/db files, always run: bun db:generate && bun db:migrate
8. After installing native packages (@node-rs/argon2), warn the user a rebuild may be needed.
```

## File placement rules for the agent

The `nextjs-claw` template has two territories:

**Infrastructure (off-limits)**:
```
app/layout.tsx
app/page.tsx
app/shell.css
app/api/**
components/**
lib/agent-engine.ts
lib/agent-events.ts
lib/use-agent-stream.ts
lib/react-source.ts
middleware.ts (the security headers one — agent may CREATE it if it doesn't exist)
next.config.ts
tsconfig.json
package.json
```

**User territory (agent works here)**:
```
app/preview/**          ← user's pages, layouts, APIs
lib/auth/**             ← created by recipe 02
lib/db/**               ← created by recipe 01
lib/email/**            ← created by recipe 03
lib/cache/**            ← created by recipe 04
lib/jobs/**             ← created by recipe 05
lib/storage/**          ← created by recipe 06
lib/logger/**           ← created by recipe 09
lib/rate-limit/**       ← created by recipe 10
lib/stripe/**           ← created by recipe 12
lib/validation/**       ← created by recipe 08
drizzle/**              ← migrations and seed
tests/**                ← test files
public/**               ← static assets
worker.ts               ← background job worker (recipe 05)
server.ts               ← custom server for WebSockets (recipe 07)
Dockerfile              ← added by recipe 14
docker-compose.prod.yml ← added by recipe 14
Caddyfile               ← added by recipe 14
vitest.config.ts        ← added by recipe 13
playwright.config.ts    ← added by recipe 13
```

**Special case: `middleware.ts`**: The agent may CREATE `middleware.ts` if it does not exist (for recipe 10 or 11). If it already exists (e.g., from recipe 02's auth middleware), the agent must MERGE new functionality into the existing file, not replace it.

## Dependency management rules for the agent

1. Never add `^` or `~` to any `package.json` entry. Always use `bun add -E <pkg>` (exact) or edit `package.json` manually with an exact version.
2. Before running `bun add`, check `package.json` to see if the package is already installed.
3. After adding native packages (`@node-rs/argon2`, anything with `build` in its postinstall), warn the user:
   > "This package compiles native code. If you see errors, run `bun install` in a clean shell."

## Environment variable management

1. Every recipe requires env vars. After creating new files, always tell the user which vars to add to `.env.local`.
2. Provide a `.env.example` stub (or update the existing one) with every var needed — value empty, comment explaining what it is.
3. Never suggest `process.env.VAR!` non-null assertions without first checking if the var is validated at startup.

## Recipe execution checklist

When executing any recipe, the agent runs through:

- [ ] Read the recipe file from `docs/stack/`
- [ ] Check if dependencies (other recipes) are already set up (e.g., auth requires DB)
- [ ] Install npm packages with `bun add -E`
- [ ] Create files from the recipe's "Code" section
- [ ] Run any required commands (migrations, mkdir)
- [ ] Tell the user which env vars to set
- [ ] Tell the user if Docker services need to be running
- [ ] Tell the user if a worker process needs to be started separately

## How recipes depend on each other

```
01-database     (foundation — required by auth, jobs, rate-limit, payments)
02-auth         (requires 01, uses 03 for email)
03-email        (standalone, used by 02 and 05)
04-cache        (standalone, used by 10 if Redis chosen)
05-background   (requires 01)
06-file-uploads (standalone, optional dep on 02 for auth check)
07-realtime     (standalone, optional dep on 01 for LISTEN/NOTIFY)
08-validation   (standalone)
09-logging      (standalone)
10-rate-limit   (requires 01 or 04)
11-security     (standalone)
12-payments     (requires 01 and 02)
13-testing      (requires 01 for DB tests)
14-deployment   (requires all others to be set up)
```

## Common agent failure modes (and how to avoid them)

- **Inventing an API**: If a recipe says `db.insert(table).values(...)`, write exactly that. Do not substitute `db.create(...)` or any other method.
- **Skipping migrations**: After any schema change, always run `bun db:generate && bun db:migrate`. Missing this causes runtime errors on first use.
- **Inline email instead of queued**: Recipe 05 recommends enqueuing email sends as background jobs. Recipe 03 can be used inline (simple, blocking) or via the queue. Default to inline for simplicity; mention the queued option.
- **Missing `'use client'`**: Any component using `useState`, `useEffect`, or react-hook-form must have `'use client'` at the top. Forgetting this causes a cryptic "hooks cannot be called in server components" error.
- **Breaking CSRF exemption**: When adding the webhook endpoint (recipe 12), always add its path to the `CSRF_EXEMPT` array in `middleware.ts`.
- **Overwriting infrastructure middleware**: If `middleware.ts` already exists with auth guards, add security headers and CSRF to the SAME file, not a separate one. Next.js only supports one middleware entry point.

## Further reading

All recipes link to official docs. The agent should use `context7` queries for up-to-date API information:

```
context7 query: drizzle-orm
context7 query: @node-rs/argon2
context7 query: nodemailer
context7 query: ioredis
context7 query: pg-boss
context7 query: @aws-sdk/client-s3
context7 query: ws
context7 query: zod
context7 query: pino
context7 query: vitest
context7 query: playwright
context7 query: stripe
```
