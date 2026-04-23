# 03 — Email (nodemailer + SMTP)

## What this gives you

Transactional email via SMTP using `nodemailer`. In dev, Mailpit catches all outgoing mail and exposes a web UI at `http://localhost:8025`. In production, point `SMTP_URL` at your own SMTP server, a self-hosted Postal/Mailcow instance, or any SMTP relay (Fastmail, Proton, your VPS mail server).

## When to reach for it / when not to

- **Use** for verification emails, password resets, notifications, receipts.
- **Skip** for marketing/bulk email — use a dedicated ESP for those (Listmonk self-hosted, or a commercial ESP) to avoid burning your SMTP reputation.
- **Alternatives not recommended as default**: Resend, SendGrid, Postmark — fine products but add vendor lock-in. Use only if your hosting provider restricts SMTP outbound (some do on port 25; switch to 587/465).

## Decision rationale

`nodemailer` has been the Node.js SMTP standard for 15+ years. It handles connection pooling, STARTTLS, auth, retries, and DKIM signing — everything needed without writing raw SMTP. Its API is stable and well-documented. No templating engine is added (React Email, MJML, Handlebars) because HTML email templates are best written as plain TS functions returning string literals — zero extra dependencies.

## Files the agent creates

- `lib/email/index.ts` — nodemailer transport singleton + `sendEmail` helper
- `lib/email/templates/verification.ts` — email verification template
- `lib/email/templates/reset-password.ts` — password reset template
- `lib/email/templates/welcome.ts` — post-signup welcome template

## Code

### `lib/email/index.ts`

```ts
// lib/email/index.ts
import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

// Singleton transport with connection pool
declare global {
  // eslint-disable-next-line no-var
  var __mailTransport: nodemailer.Transporter | undefined;
}

function createTransport(): nodemailer.Transporter {
  const url = process.env.SMTP_URL;
  if (!url) throw new Error('SMTP_URL is not set');

  return nodemailer.createTransport(url, {
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Mailpit in dev does not require auth; real SMTP handles creds via the URL
  });
}

const transport: nodemailer.Transporter =
  process.env.NODE_ENV === 'production'
    ? createTransport()
    : (global.__mailTransport ??= createTransport());

export interface EmailPayload {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

const FROM =
  process.env.EMAIL_FROM ??
  `"${process.env.APP_NAME ?? 'App'}" <noreply@${process.env.EMAIL_DOMAIN ?? 'example.com'}>`;

// Idempotency: pass an idempotency key to prevent duplicate sends on retry.
// Keys are stored in memory for 1 hour — good enough for single-server setups.
const sentKeys = new Map<string, number>();

export async function sendEmail(
  payload: EmailPayload,
  idempotencyKey?: string,
): Promise<void> {
  if (idempotencyKey) {
    const sentAt = sentKeys.get(idempotencyKey);
    if (sentAt && Date.now() - sentAt < 60 * 60 * 1000) {
      return; // Already sent within the last hour
    }
  }

  const message: Mail.Options = {
    from: FROM,
    to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo: payload.replyTo,
  };

  await transport.sendMail(message);

  if (idempotencyKey) {
    sentKeys.set(idempotencyKey, Date.now());
    // Prune old keys to prevent unbounded memory growth
    if (sentKeys.size > 10_000) {
      const cutoff = Date.now() - 60 * 60 * 1000;
      for (const [k, t] of sentKeys) {
        if (t < cutoff) sentKeys.delete(k);
      }
    }
  }
}

// Convenience wrappers for common transactional emails
export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const { verificationEmail } = await import('./templates/verification');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const link = `${appUrl}/preview/auth/verify-email?token=${token}`;
  return sendEmail(verificationEmail(email, link), `verify:${token}`);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const { passwordResetEmail } = await import('./templates/reset-password');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const link = `${appUrl}/preview/auth/reset-password?token=${token}`;
  return sendEmail(passwordResetEmail(email, link), `reset:${token}`);
}
```

### `lib/email/templates/verification.ts`

```ts
// lib/email/templates/verification.ts
import type { EmailPayload } from '../index';

export function verificationEmail(
  recipientEmail: string,
  verificationLink: string,
): EmailPayload {
  return {
    to: recipientEmail,
    subject: 'Verify your email address',
    text: `
Welcome! Please verify your email address by visiting the link below.

${verificationLink}

This link expires in 24 hours. If you did not create an account, you can safely ignore this email.
    `.trim(),
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 20px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:40px;border:1px solid #e5e7eb">
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 16px">Verify your email</h1>
    <p style="color:#6b7280;line-height:1.6;margin:0 0 24px">
      Click the button below to verify your email address.
      This link expires in 24 hours.
    </p>
    <a href="${verificationLink}"
       style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px">
      Verify email
    </a>
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;line-height:1.5">
      Or copy and paste this link:<br>
      <a href="${verificationLink}" style="color:#6b7280;word-break:break-all">${verificationLink}</a>
    </p>
  </div>
</body>
</html>`,
  };
}
```

### `lib/email/templates/reset-password.ts`

```ts
// lib/email/templates/reset-password.ts
import type { EmailPayload } from '../index';

export function passwordResetEmail(
  recipientEmail: string,
  resetLink: string,
): EmailPayload {
  return {
    to: recipientEmail,
    subject: 'Reset your password',
    text: `
You requested a password reset. Use the link below to set a new password.

${resetLink}

This link expires in 1 hour. If you did not request this, ignore this email.
    `.trim(),
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 20px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:40px;border:1px solid #e5e7eb">
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 16px">Reset your password</h1>
    <p style="color:#6b7280;line-height:1.6;margin:0 0 24px">
      Click the button below to set a new password. This link expires in 1 hour.
    </p>
    <a href="${resetLink}"
       style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px">
      Reset password
    </a>
    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;line-height:1.5">
      If you did not request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`,
  };
}
```

### `lib/email/templates/welcome.ts`

```ts
// lib/email/templates/welcome.ts
import type { EmailPayload } from '../index';

export function welcomeEmail(recipientEmail: string, appUrl: string): EmailPayload {
  return {
    to: recipientEmail,
    subject: 'Welcome!',
    text: `Thanks for signing up. Get started at ${appUrl}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9fafb;margin:0;padding:40px 20px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:40px;border:1px solid #e5e7eb">
    <h1 style="font-size:22px;font-weight:700;color:#111;margin:0 0 16px">Welcome!</h1>
    <p style="color:#6b7280;line-height:1.6;margin:0 0 24px">
      Your account is ready. Click below to get started.
    </p>
    <a href="${appUrl}"
       style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px">
      Open app
    </a>
  </div>
</body>
</html>`,
  };
}
```

## Commands to run

```bash
bun add -E nodemailer
bun add -E @types/nodemailer --dev
```

Add to `.env.local`:
```bash
SMTP_URL=smtp://localhost:1025   # Mailpit dev
EMAIL_FROM='"My App" <noreply@myapp.com>'
EMAIL_DOMAIN=myapp.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Start Mailpit (from docker-compose.dev.yml — see recipe 00):
```bash
docker compose -f docker-compose.dev.yml up mailpit -d
# Open http://localhost:8025 to view caught emails
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'send emails', 'add email verification', 'send password reset emails', 'send notifications': follow `docs/stack/03-email.md`. Run `bun add -E nodemailer`. Create `lib/email/index.ts` and the templates. Set `SMTP_URL` in `.env.local`. Start Mailpit from docker-compose.dev.yml."

## Common pitfalls

- **`SMTP_URL` must use correct scheme**: `smtp://` for plain/STARTTLS (port 587), `smtps://` for implicit TLS (port 465). Mailpit dev uses `smtp://localhost:1025`.
- **Hot reload transport leak**: The singleton `global.__mailTransport` guard prevents multiple SMTP connection pools from opening in dev.
- **Idempotency key collisions**: The in-memory key store is per-process. For multi-process prod deployments, move idempotency keys to Redis (recipe 04) or a Postgres table.
- **Long-running email in request handlers**: For high-volume scenarios, send email from a background job (recipe 05) rather than inline in the API route. For transactional emails on signup/reset (1–2 at a time), inline is fine.
- **HTML email rendering**: Some email clients (Outlook 2019) ignore CSS Grid and Flexbox. Inline styles in `<table>` layouts are the only reliable approach for Outlook. The templates above use inline styles, which work everywhere except Outlook's advanced layout features.
- **Bounce handling / DMARC**: Out of scope for initial setup. Ensure your sending domain has SPF and DKIM records set before going to production.

## Further reading

- `nodemailer` docs (context7 query: `nodemailer`)
- Mailpit: https://github.com/axllent/mailpit
- Email HTML compatibility: https://www.caniemail.com
