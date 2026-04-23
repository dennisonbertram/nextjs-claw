# 14 — Deployment (Docker Compose + Caddy)

## What this gives you

A production-grade Docker Compose setup: the Next.js app, a background worker (recipe 05), Postgres, Redis, MinIO, and Caddy as the HTTPS reverse proxy with automatic certificate provisioning. Everything runs on a single VPS or dedicated server.

## When to reach for it / when not to

- **Use** for self-hosted production deployments on any VPS (Hetzner, DigitalOcean, Linode, bare metal).
- **Skip Kubernetes**: This setup handles everything a typical SaaS app needs. Kubernetes adds operational complexity that pays off only when you have a team dedicated to infrastructure.
- **Skip Vercel**: Vercel conflicts with the self-hosted ethos. It also doesn't support long-running workers (recipe 05), WebSockets, and has complex pricing. Railway is a reasonable alternative if you want managed infra with less lock-in.

## Prerequisites

- A server with Docker and Docker Compose v2 installed
- A domain name with DNS pointing to the server's IP
- Ports 80 and 443 open in the firewall

## Files the agent creates

- `docker-compose.prod.yml` — production services
- `Dockerfile` — Next.js app image
- `Dockerfile.worker` — background worker image
- `Caddyfile` — Caddy reverse proxy config

## Code

### `Dockerfile`

```dockerfile
# Dockerfile — Next.js production image
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* package-lock.json* yarn.lock* ./
RUN corepack enable && corepack prepare bun@latest --activate || true
RUN bun install --frozen-lockfile 2>/dev/null || npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

Add to `next.config.ts` for standalone output:
```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

### `Dockerfile.worker`

```dockerfile
# Dockerfile.worker — background job worker
FROM node:22-alpine
WORKDIR /app
COPY package.json bun.lockb* package-lock.json* ./
RUN corepack enable && corepack prepare bun@latest --activate || true
RUN bun install --frozen-lockfile 2>/dev/null || npm ci
COPY . .

CMD ["node", "--loader", "tsx", "worker.ts"]
```

### `Caddyfile`

```
# Caddyfile
# Replace example.com with your actual domain

example.com {
    # Automatic HTTPS via Let's Encrypt (no config needed)
    reverse_proxy app:3000

    # Pass real IP to Next.js
    header_up X-Real-IP {remote_host}
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}

    # Caddy already adds most security headers.
    # The Next.js middleware (recipe 11) adds the rest.

    # Compress responses
    encode gzip
}

# MinIO console (optional — remove in production if not needed publicly)
minio.example.com {
    reverse_proxy minio:9001
}
```

### `docker-compose.prod.yml`

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    networks:
      - public
      - internal

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      SMTP_URL: ${SMTP_URL}
      S3_ENDPOINT: ${S3_ENDPOINT}
      S3_REGION: ${S3_REGION}
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY}
      S3_BUCKET: ${S3_BUCKET}
      SESSION_SECRET: ${SESSION_SECRET}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/agent/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      SMTP_URL: ${SMTP_URL}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-app}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-app}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-app}"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    networks:
      - internal
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:RELEASE.2024-11-07T00-52-20Z
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"
    networks:
      - internal
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
  miniodata:
  caddy_data:
  caddy_config:

networks:
  public:
  internal:
    internal: true  # No external access — only via caddy
```

### `.env.prod` (example — fill in real values, never commit)

```bash
# .env.prod — copy to server, never commit
DATABASE_URL=postgresql://app:STRONG_PASSWORD@postgres:5432/app
POSTGRES_PASSWORD=STRONG_PASSWORD
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379
REDIS_PASSWORD=REDIS_PASSWORD
SMTP_URL=smtp://user:password@mail.example.com:587
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=STRONG_MINIO_PASSWORD
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=STRONG_MINIO_PASSWORD
S3_BUCKET=uploads
SESSION_SECRET=generate-with-openssl-rand-base64-32
NEXT_PUBLIC_APP_URL=https://example.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Deploy script

```bash
#!/usr/bin/env bash
# deploy.sh — run on the server
set -euo pipefail

# Pull latest code
git pull origin main

# Run migrations before starting the new app
docker compose -f docker-compose.prod.yml run --rm app sh -c \
  "DATABASE_URL=$DATABASE_URL npx drizzle-kit migrate"

# Build and restart app + worker
docker compose -f docker-compose.prod.yml up -d --build app worker

# Prune old images
docker image prune -f

echo "Deploy complete"
```

## Commands to run

```bash
# On the server (first deploy):
docker compose -f docker-compose.prod.yml up -d

# Create MinIO bucket (first time):
docker compose -f docker-compose.prod.yml exec minio \
  mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
docker compose -f docker-compose.prod.yml exec minio \
  mc mb local/uploads

# View logs:
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f worker
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'deploy', 'set up production', 'go to production': follow `docs/stack/14-deployment.md`. Create `Dockerfile`, `Dockerfile.worker`, `Caddyfile`, and `docker-compose.prod.yml`. Add `output: 'standalone'` to `next.config.ts`. Create `.env.prod` template. NEVER commit real secrets."

## Common pitfalls

- **`output: 'standalone'`**: Required for the Dockerfile to produce a minimal image. Without it, the `node server.js` entry point doesn't exist. Add it to `next.config.ts` before building.
- **Migrations before app start**: Always run `drizzle-kit migrate` before starting the new app container. The deploy script above does this. If you start the app first, it may crash on missing columns.
- **Redis password in URL**: The `REDIS_URL` in production must include the password: `redis://:password@redis:6379`. The leading `:` before the password is correct URL syntax.
- **Internal network**: The `internal: true` on the `internal` network means Postgres, Redis, and MinIO are not accessible from outside Docker. Only Caddy (on the `public` network) has external access. This is intentional security isolation.
- **Caddy automatic HTTPS**: Caddy gets a Let's Encrypt certificate automatically when it can reach `acme-v02.api.letsencrypt.org`. Ensure port 443 is open in your firewall and that your domain's DNS resolves to the server.
- **S3_ENDPOINT for MinIO in prod**: Use `http://minio:9000` (the Docker service name) for server-side communication. For browser-direct uploads (presigned URLs), the URL must be publicly accessible — either expose MinIO on a subdomain (`minio.example.com`) or use the main domain with a path-based route in Caddy.
- **`next.config.ts` changes**: If you change `next.config.ts` (e.g., add `output: 'standalone'`), the agent must be told this breaks hot reload in some cases. A full rebuild is needed.

## Further reading

- Caddy docs: https://caddyserver.com/docs
- Docker Compose docs: https://docs.docker.com/compose/
- Next.js standalone output: https://nextjs.org/docs/app/api-reference/next-config-js/output
