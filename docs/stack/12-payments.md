# 12 — Payments (Stripe)

## What this gives you

Stripe integration: checkout sessions (redirect flow), subscription management, and webhook handling with signature verification. Your Postgres database is the source of truth for entitlements — Stripe is the source of truth for money. Includes the subscription table schema, a webhook handler, and a billing portal redirect.

## When to reach for it / when not to

- **Use Stripe** when the app needs to charge money. It is the one unavoidable third-party dependency in this stack. There is no credible self-hosted alternative.
- **Skip** for internal tools, free-tier apps, or apps where payments come later.
- **Alternatives** (mention but don't default to): Lemon Squeezy (simpler but US-only for payout), Paddle (handles EU VAT for you, slightly more complex), PayPal (avoid — terrible DX). Stripe's dominance is earned.

## The core principle

> Stripe is the source of truth for **money**. Your Postgres database is the source of truth for **entitlements** (what features a user can access).

Never derive "can this user access feature X?" from a live Stripe API call on every request. That's slow, fragile (Stripe outages affect your app), and unnecessary. Instead:

1. Stripe sends a webhook when a payment succeeds, subscription changes, or cancellation happens.
2. Your webhook handler updates a `subscriptions` table in Postgres.
3. Your auth/feature checks read from that table.

## Files the agent creates

- `lib/db/schema.ts` — add `subscriptions` table (amend existing)
- `lib/stripe/index.ts` — Stripe client singleton
- `lib/stripe/checkout.ts` — create checkout session
- `lib/stripe/portal.ts` — billing portal redirect
- `lib/stripe/webhooks.ts` — webhook verification + event handling
- `app/preview/api/stripe/webhook/route.ts` — webhook endpoint
- `app/preview/api/stripe/checkout/route.ts` — create checkout session endpoint
- `app/preview/api/stripe/portal/route.ts` — billing portal endpoint

## Schema addition

Add to `lib/db/schema.ts`:

```ts
// Add to lib/db/schema.ts

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull().unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripePriceId: text('stripe_price_id'),
    status: varchar('status', { length: 32 }).notNull().default('inactive'),
    // 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive'
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('subs_user_id_idx').on(t.userId),
    index('subs_stripe_customer_idx').on(t.stripeCustomerId),
  ],
);

export type Subscription = typeof subscriptions.$inferSelect;
```

## Code

### `lib/stripe/index.ts`

```ts
// lib/stripe/index.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil',  // Pin to a specific API version
  typescript: true,
});
```

### `lib/stripe/checkout.ts`

```ts
// lib/stripe/checkout.ts
import { stripe } from './index';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createCheckoutSession({
  userId,
  email,
  priceId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  // Get or create Stripe customer
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  let customerId = existing?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    customerId = customer.id;
    // Upsert subscription row with customer ID
    await db
      .insert(subscriptions)
      .values({ userId, stripeCustomerId: customerId })
      .onConflictDoNothing();
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  return session.url!;
}
```

### `lib/stripe/portal.ts`

```ts
// lib/stripe/portal.ts
import { stripe } from './index';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createPortalSession(
  userId: string,
  returnUrl: string,
): Promise<string> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    throw new Error('No Stripe customer for this user');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}
```

### `lib/stripe/webhooks.ts`

```ts
// lib/stripe/webhooks.ts
import { stripe } from './index';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export function verifyWebhook(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .update(subscriptions)
        .set({ status: 'canceled', updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await db
          .update(subscriptions)
          .set({ status: 'past_due', updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, String(invoice.subscription)));
      }
      break;
    }

    default:
      // Unhandled event — log and ignore
      console.log(`[stripe] Unhandled event: ${event.type}`);
  }
}

async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price.id ?? null;
  const periodEnd = new Date(sub.current_period_end * 1000);

  await db
    .update(subscriptions)
    .set({
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      status: sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}
```

### `app/preview/api/stripe/webhook/route.ts`

```ts
// app/preview/api/stripe/webhook/route.ts
// IMPORTANT: Do NOT use body parsing middleware on this route.
// Stripe signature verification requires the raw request body.

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook, handleWebhookEvent } from '@/lib/stripe/webhooks';

export const runtime = 'nodejs';

// Disable Next.js automatic body parsing for this route
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const payload = await req.arrayBuffer();
  const rawBody = Buffer.from(payload);

  let event;
  try {
    event = verifyWebhook(rawBody, signature);
  } catch (err) {
    console.error('[stripe webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    await handleWebhookEvent(event);
  } catch (err) {
    console.error('[stripe webhook] Handler error:', err);
    // Return 200 to prevent Stripe from retrying — log the error and investigate
    // Only return 5xx if you WANT Stripe to retry (idempotent operations only)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

### Checking entitlements

```ts
// lib/stripe/entitlements.ts
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function isSubscribed(userId: string): Promise<boolean> {
  const [sub] = await db
    .select({ status: subscriptions.status, periodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub) return false;
  if (sub.status === 'active' || sub.status === 'trialing') return true;
  // Grace period: allow access until period end even if canceled
  if (sub.status === 'canceled' && sub.periodEnd && sub.periodEnd > new Date()) return true;
  return false;
}
```

## Commands to run

```bash
bun add -E stripe

# Add to .env.local:
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Run Stripe CLI to forward webhooks to local dev:
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

After adding the `subscriptions` table to your schema:
```bash
bun db:generate
bun db:migrate
```

## Integration hook — how the embedded agent invokes this

> "When the user asks to 'add payments', 'add subscriptions', 'charge for access': follow `docs/stack/12-payments.md`. Run `bun add -E stripe`. Add the `subscriptions` table to `lib/db/schema.ts`. Run `bun db:generate && bun db:migrate`. Create the Stripe files. EXEMPT the webhook route from CSRF checks in `middleware.ts`."

## Common pitfalls

- **Webhook raw body**: Stripe signature verification requires the raw, un-parsed request body. If Next.js parses the body first (e.g., in middleware that calls `req.json()`), the signature will fail. The webhook route must read via `req.arrayBuffer()`.
- **Returning 500 on handler errors**: If your webhook handler throws a 500, Stripe will retry the event up to 25 times over 3 days. Return 200 after logging the error to prevent retry spam. Only return 5xx if the operation is idempotent and retry is desired.
- **CSRF exemption**: Add `/api/stripe/webhook` to the `CSRF_EXEMPT` list in `middleware.ts`. Stripe doesn't send your CSRF cookie.
- **Stripe API version pinning**: The `apiVersion` in `lib/stripe/index.ts` must be an exact version string from Stripe's changelog. Stripe will warn you when the pinned version is deprecated. Update it explicitly — never use `'latest'`.
- **Test vs live keys**: `STRIPE_SECRET_KEY` starting with `sk_test_` is test mode. Never commit live keys. Use separate `.env.local` for dev.

## Further reading

- Stripe docs: https://stripe.com/docs
- Stripe webhooks: https://stripe.com/docs/webhooks
- `stripe` npm package (context7 query: `stripe`)
