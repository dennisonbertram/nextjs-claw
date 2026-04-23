# Stack Cookbook

Opinionated, self-hosted recipes for capabilities the embedded Claude agent adds to a `nextjs-claw` project. Each recipe tells the agent exactly what files to create, what code to write, and what commands to run.

## Design principle

Self-hosted, vendor-neutral. You own the stack: Postgres (not Supabase), home-grown auth (not Clerk), SMTP (not Resend), Redis + pg-boss (not Upstash), MinIO (not S3). npm packages are fine; proprietary SaaS is not the default.

## Recipes

| File | Topic | Core deps |
|------|-------|-----------|
| [00-overview.md](./00-overview.md) | Design philosophy, Docker Compose dev services, env-var contract | — |
| [01-database.md](./01-database.md) | Postgres + Drizzle ORM | `drizzle-orm`, `pg`, `drizzle-kit` |
| [02-auth.md](./02-auth.md) | Sessions, passwords, OAuth | `@node-rs/argon2` |
| [03-email.md](./03-email.md) | SMTP via nodemailer | `nodemailer` |
| [04-cache-and-sessions.md](./04-cache-and-sessions.md) | Redis cache + rate limit | `ioredis` |
| [05-background-jobs.md](./05-background-jobs.md) | pg-boss job queue | `pg-boss` |
| [06-file-uploads.md](./06-file-uploads.md) | Local disk → MinIO presigned uploads | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| [07-realtime.md](./07-realtime.md) | SSE → WebSockets → LISTEN/NOTIFY | `ws` |
| [08-validation-and-forms.md](./08-validation-and-forms.md) | Zod + react-hook-form | `zod`, `react-hook-form`, `@hookform/resolvers` |
| [09-logging-and-observability.md](./09-logging-and-observability.md) | pino structured logs | `pino`, `pino-pretty` |
| [10-rate-limiting.md](./10-rate-limiting.md) | Postgres or Redis sliding window | — (uses existing deps) |
| [11-security-headers-and-csrf.md](./11-security-headers-and-csrf.md) | Middleware security headers + CSRF | — |
| [12-payments.md](./12-payments.md) | Stripe (reluctantly) | `stripe` |
| [13-testing.md](./13-testing.md) | Vitest + Playwright | `vitest`, `@playwright/test` |
| [14-deployment.md](./14-deployment.md) | Docker Compose prod + Caddy HTTPS | — |
| [15-agent-integration.md](./15-agent-integration.md) | How the embedded agent uses this cookbook | — |

## Quick start for the agent

1. User asks for a capability.
2. Agent consults [15-agent-integration.md](./15-agent-integration.md) for the capability → recipe map.
3. Agent reads the matching recipe and follows it exactly.
4. Agent pins all deps (`bun add -E`), creates files, runs migrations, reports env vars needed.
