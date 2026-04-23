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
    const expires = Date.now() + ttlSeconds * 1000;
    const sig = createHmac('sha256', SECRET)
      .update(`${key}:${expires}`)
      .digest('base64url');
    // The actual upload handler is at /api/upload/local
    return `${APP_URL}/api/upload/local?key=${encodeURIComponent(key)}&expires=${expires}&sig=${sig}`;
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
