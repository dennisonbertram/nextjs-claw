# 06 — File Uploads (local disk → MinIO)

## What this gives you

File upload handling with presigned PUT URLs: the browser uploads directly to storage without proxying bytes through Next.js. In dev, files land in a local `uploads/` directory served as static files. In production, files go to MinIO — a self-hosted S3-compatible object store. The URL you generate in dev and prod are structurally identical, making the switch transparent.

## When to reach for it / when not to

- **Use** for user-uploaded images, documents, videos, attachments.
- **Skip** for files generated server-side (PDFs, exports) — write those to disk and stream them.
- **Never proxy bytes through Next.js**: A Next.js route handler that reads a multipart body and writes to disk is fine for small files (<10 MB) but terrible at scale. Use presigned URLs always.

## Decision rationale

**MinIO over AWS S3**: MinIO is 100% S3-API-compatible, runs locally in Docker, and you own the data. The code is identical for both — just change the endpoint URL. No AWS account required in dev or staging.

**Raw S3 HTTP vs `@aws-sdk/client-s3`**: The AWS SDK is large (~1 MB compressed) and pulls in many deps. For basic presigned PUT + GET, raw S3 HTTP with `@aws-sdk/s3-request-presigner` is lighter. We use `@aws-sdk/client-s3` for the signer only — it's the officially supported way to generate signatures without reimplementing SigV4.

**Presigned PUT (direct upload) vs proxied upload**: Direct upload means: (1) browser asks your API for a presigned URL, (2) browser PUT directly to MinIO, (3) browser tells your API "I uploaded to this key". Your Next.js server never sees the bytes. This scales to arbitrary file sizes and moves bandwidth cost to MinIO.

## Files the agent creates

- `lib/storage/index.ts` — storage adapter (dev: local disk, prod: MinIO)
- `lib/storage/local.ts` — local disk handler
- `lib/storage/s3.ts` — MinIO/S3 handler
- `app/preview/api/upload/presign/route.ts` — presign endpoint
- `app/preview/api/upload/local/[...key]/route.ts` — local PUT handler (receives the actual bytes in dev)
- `app/preview/api/upload/confirm/route.ts` — confirmation endpoint (optional)
- `public/uploads/` — dev upload target (add to .gitignore)

## Code

### `lib/storage/index.ts`

```ts
// lib/storage/index.ts
// Selects the storage backend based on S3_ENDPOINT env var.
// In dev (no S3_ENDPOINT or pointing to localhost), uses local disk.

import type { StorageBackend } from './types';

export type { StorageBackend };

let _backend: StorageBackend | null = null;

export function getStorage(): StorageBackend {
  if (_backend) return _backend;

  const endpoint = process.env.S3_ENDPOINT;
  if (endpoint && !endpoint.includes('localhost') && !endpoint.includes('127.0.0.1')) {
    const { S3Backend } = require('./s3') as typeof import('./s3');
    _backend = new S3Backend();
  } else {
    const { LocalBackend } = require('./local') as typeof import('./local');
    _backend = new LocalBackend();
  }

  return _backend;
}

// Convenience re-exports
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  ttlSeconds = 300,
): Promise<string> {
  return getStorage().generatePresignedUploadUrl(key, contentType, ttlSeconds);
}

export async function generatePresignedDownloadUrl(
  key: string,
  ttlSeconds = 3600,
): Promise<string> {
  return getStorage().generatePresignedDownloadUrl(key, ttlSeconds);
}

export async function deleteObject(key: string): Promise<void> {
  return getStorage().deleteObject(key);
}
```

### `lib/storage/types.ts`

```ts
// lib/storage/types.ts
export interface StorageBackend {
  generatePresignedUploadUrl(key: string, contentType: string, ttlSeconds: number): Promise<string>;
  generatePresignedDownloadUrl(key: string, ttlSeconds: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
```

### `lib/storage/local.ts`

```ts
// lib/storage/local.ts
// Dev storage: files are written to public/uploads/ and served as static assets.
// In dev, "presigned URLs" are just signed tokens that the Next.js upload handler validates.

import { randomBytes, createHmac } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { StorageBackend } from './types';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret';

export class LocalBackend implements StorageBackend {
  async generatePresignedUploadUrl(
    key: string,
    _contentType: string,
    ttlSeconds: number,
  ): Promise<string> {
    const exp = Date.now() + ttlSeconds * 1000;
    const sig = createHmac('sha256', SECRET)
      .update(`${key}:${exp}`)
      .digest('base64url');
    // The upload handler lives at /api/upload/local/[...key].
    // Key segments become path components; sig and exp are query params.
    return `${APP_URL}/api/upload/local/${key}?sig=${sig}&exp=${exp}`;
  }

  async generatePresignedDownloadUrl(key: string, _ttlSeconds: number): Promise<string> {
    // Local files are public static assets
    return `${APP_URL}/uploads/${key}`;
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.rm(filePath, { force: true });
  }
}
```

### `lib/storage/s3.ts`

```ts
// lib/storage/s3.ts
// MinIO / S3 backend using @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner

import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageBackend } from './types';

function createClient(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) throw new Error('S3_ENDPOINT is not set');

  return new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // Required for MinIO
  });
}

const BUCKET = process.env.S3_BUCKET ?? 'uploads';
let _client: S3Client | null = null;

function getClient(): S3Client {
  return (_client ??= createClient());
}

export class S3Backend implements StorageBackend {
  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    ttlSeconds: number,
  ): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(getClient(), cmd, { expiresIn: ttlSeconds });
  }

  async generatePresignedDownloadUrl(
    key: string,
    ttlSeconds: number,
  ): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(getClient(), cmd, { expiresIn: ttlSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  }
}
```

### `app/preview/api/upload/presign/route.ts`

```ts
// app/preview/api/upload/presign/route.ts
// Called by the browser to get a presigned PUT URL.
// Returns the URL + the final object key.

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getCurrentUser } from '@/lib/auth/current-user';
import { generatePresignedUploadUrl } from '@/lib/storage';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'text/plain',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  // Auth check — remove if uploads are public
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contentType, size, filename } = await req.json() as {
    contentType?: string;
    size?: number;
    filename?: string;
  };

  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }
  if (!size || size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  // Generate a unique object key: users/{userId}/{random}/{original-name}
  const ext = filename?.split('.').pop() ?? 'bin';
  const key = `users/${user.id}/${randomBytes(12).toString('base64url')}.${ext}`;

  const uploadUrl = await generatePresignedUploadUrl(key, contentType, 300);

  return NextResponse.json({ uploadUrl, key });
}
```

### `app/preview/api/upload/local/[...key]/route.ts`

This handler receives the actual file bytes from the browser PUT request in dev. The presign endpoint issues a signed URL pointing here; this handler verifies the signature before writing to disk.

```ts
// app/preview/api/upload/local/[...key]/route.ts
// Dev-only local PUT handler.
// Receives the presigned PUT request from the browser and writes the file to
// public/uploads/<key>. Production uses MinIO (the browser PUTs there directly).

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const UPLOAD_SECRET = process.env.SESSION_SECRET ?? 'dev-secret';
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// Key characters: a-z A-Z 0-9 . _ / - (no .., no leading slash, no hidden files)
const KEY_RE = /^[a-z0-9][a-z0-9._/-]*$/i;

function sanitizeKey(segments: string[]): string | null {
  const key = segments.join('/');
  if (!KEY_RE.test(key)) return null;
  if (key.includes('..')) return null;
  if (key.split('/').some((s) => s.startsWith('.'))) return null;
  return key;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: keySegments } = await params;
  const key = sanitizeKey(keySegments);
  if (!key) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  // Size guard — reject before reading the body
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 });
  }

  // Signature + expiry verification
  const { searchParams } = new URL(req.url);
  const sig = searchParams.get('sig');
  const exp = searchParams.get('exp');

  if (!sig || !exp) {
    return NextResponse.json({ error: 'Missing signature or expiry' }, { status: 401 });
  }

  const expMs = Number(exp);
  if (Number.isNaN(expMs) || expMs <= Date.now()) {
    return NextResponse.json({ error: 'Upload URL has expired' }, { status: 401 });
  }

  // Reconstruct what the presign endpoint signed: "<key>:<exp>"
  const expectedSig = createHmac('sha256', UPLOAD_SECRET)
    .update(`${key}:${exp}`)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  const sigValid =
    sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);

  if (!sigValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Write file — stream the body to disk, do NOT buffer with req.arrayBuffer()
  const destPath = path.join(UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  if (!req.body) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  }

  // node:stream/promises pipeline streams the ReadableStream<Uint8Array> to a
  // writable file handle without buffering the entire file in memory.
  const dest = await fs.open(destPath, 'w');
  try {
    await pipeline(
      Readable.fromWeb(req.body as import('stream/web').ReadableStream),
      dest.createWriteStream(),
    );
  } finally {
    await dest.close();
  }

  const stat = await fs.stat(destPath);
  return NextResponse.json({ url: `/uploads/${key}`, size: stat.size });
}
```

**Serving note:** `public/uploads/` is served by Next.js as static files, which is fine for local dev. In production, serve the `public/uploads/` directory directly via a reverse proxy (e.g., Caddy `file_server`) to bypass Node.js entirely — see `docs/stack/14-deployment.md`. In production with real MinIO, the browser PUTs directly to MinIO and this local route is never hit.

### Browser-side upload snippet

```ts
// In a Client Component or browser script:

async function uploadFile(file: File): Promise<string> {
  // 1. Get presigned URL
  const { uploadUrl, key } = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
      filename: file.name,
    }),
  }).then((r) => r.json());

  // 2. PUT directly to storage (MinIO or local handler)
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  // 3. Return the key (store in your DB with the record it belongs to)
  return key;
}
```

## Commands to run

```bash
bun add -E @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Add uploads dir to .gitignore
echo "public/uploads/" >> .gitignore

# Create the MinIO bucket (first time, after starting MinIO from docker-compose)
# Option A: via MinIO console at http://localhost:9001 (login: minioadmin/minioadmin)
# Option B: via mc CLI:
#   brew install minio/stable/mc
#   mc alias set local http://localhost:9000 minioadmin minioadmin
#   mc mb local/uploads
#   mc anonymous set download local/uploads  # if you want public read
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add file uploads', 'let users upload images/files', 'add an upload form': follow `docs/stack/06-file-uploads.md`. Run `bun add -E @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`. Create `lib/storage/` files and `app/preview/api/upload/presign/route.ts`. Use the browser-side snippet in the upload UI component."

## Common pitfalls

- **Never buffer the file in Next.js**: Route handlers that call `req.arrayBuffer()` on large files will OOM the Node process. Always use presigned URLs.
- **MinIO CORS**: By default, MinIO does not allow browser-direct PUT from `localhost:3000`. Set a CORS policy on the bucket:
  ```json
  {
    "cors": [{
      "allowedOrigins": ["http://localhost:3000"],
      "allowedMethods": ["PUT", "GET"],
      "allowedHeaders": ["*"],
      "maxAgeSeconds": 3600
    }]
  }
  ```
  Apply via `mc cors set --config cors.json local/uploads`.
- **Content-Type in PUT**: The `Content-Type` header in the presigned URL must match the `Content-Type` in the PUT request exactly, or S3 will return 403.
- **`forcePathStyle: true`**: Required for MinIO. Remove this flag when pointing at real AWS S3.
- **Object key sanitization**: Never allow user-supplied filenames directly in the key. Generate a random prefix as shown above.
- **Local backend in production**: The `LocalBackend` writes to `public/uploads/`. On ephemeral filesystems (Docker, Railway) this data is lost on redeploy. Always use `S3Backend` in production.

## Further reading

- `@aws-sdk/client-s3` (context7 query: `@aws-sdk/client-s3`)
- MinIO docs: https://min.io/docs
- S3 presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
