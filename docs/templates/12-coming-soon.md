# 12 — Coming Soon / Waitlist

## What this gives you

A centered, minimal launch page. The whole viewport is one message: what it is, when it arrives, and a way to get notified. No navbar, no footer nav, no distraction. Optionally includes a countdown timer (static in this recipe — wire to a real date), a live subscriber count for social proof, and a logo. The design is intentionally spare: generous whitespace, large type, a single CTA. Suitable for pre-launch products, feature announcements, private betas, and event registrations.

## Visual reference

Inspiration URLs (confirmed live 2026-04-23):
- https://vercel.com — "everything above the fold" discipline, single focused CTA
- https://linear.app — confident minimal typography, no hero image needed
- https://ghost.org — email-first hero with social proof near the capture

## Design tokens

- **Palette:** `neutral-950` bg, `neutral-100` fg, `neutral-500` muted, `indigo-500` accent, `neutral-900` input bg
- **Typography:** `text-sm font-mono uppercase tracking-widest` label; `text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight` h1; `text-lg text-neutral-400` subhead
- **Key ideas:**
  - Full viewport centered layout (`min-h-screen flex flex-col items-center justify-center`)
  - Countdown uses `grid grid-cols-4` with each time unit in its own cell — clear, scannable
  - Progress bar below CTA shows "N of N_GOAL spots claimed" — creates urgency without being manipulative
  - Noise texture or grid overlay via a subtle repeating SVG pattern adds depth without a hero image

## Sections (in order)

1. **Logo / wordmark** — top of centered stack, small
2. **Status badge** — "Coming soon" / "Private beta" / "Launching Q3 2026"
3. **Headline** — what it is, big type
4. **Subtitle** — one-sentence elaboration
5. **Countdown timer** — days / hours / minutes / seconds (four cells)
6. **Email capture** — single input + CTA button
7. **Social proof / progress** — "X of Y early spots claimed" or subscriber count
8. **Footer line** — copyright + social links, minimal

## Files the agent creates

- `app/preview/page.tsx` — full page
- `app/preview/layout.tsx` — metadata
- `app/preview/globals.css` — base styles

## Code

### `app/preview/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crestline — Coming Soon',
  description: 'A new kind of infrastructure monitoring. Join the waitlist.',
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}
```

### `app/preview/globals.css`

```css
@import "tailwindcss";

@theme {
  --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', monospace;
}
```

### `app/preview/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';

// Set your launch date here
const LAUNCH_DATE = new Date('2026-09-01T09:00:00Z');
const TOTAL_SPOTS = 500;
const CLAIMED_SPOTS = 347;

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  / 60_000),
      seconds: Math.floor((diff % 60_000)     / 1_000),
    };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setTime(calc), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-neutral-50">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">{label}</span>
    </div>
  );
}

export default function ComingSoon() {
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const progressPct = Math.round((CLAIMED_SPOTS / TOTAL_SPOTS) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Subtle grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z' fill='%23ffffff'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
        aria-hidden="true"
      />

      {/* Main centered content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="12" height="12" rx="3" fill="#6366f1"/>
            <rect x="14" y="2" width="10" height="10" rx="2.5" fill="#818cf8" opacity="0.5"/>
            <rect x="4" y="14" width="10" height="10" rx="2.5" fill="#4f46e5" opacity="0.7"/>
          </svg>
          <span className="font-bold text-neutral-200 text-lg tracking-tight">Crestline</span>
        </div>

        {/* Status badge */}
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" aria-hidden="true" />
          Private beta · Launching September 2026
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-50 mb-5 leading-[1.02] max-w-3xl">
          Infrastructure monitoring<br className="hidden sm:block" />
          that{' '}
          <span className="text-indigo-400">actually explains itself</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-neutral-400 max-w-xl mb-10 leading-relaxed">
          Crestline watches your stack and gives you plain-English explanations of what's wrong,
          why it happened, and what to do next. No dashboards to build. No alert noise to tune.
        </p>

        {/* Countdown */}
        <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-10" aria-label="Countdown to launch">
          <CountdownCell value={days}    label="days" />
          <CountdownCell value={hours}   label="hours" />
          <CountdownCell value={minutes} label="min" />
          <CountdownCell value={seconds} label="sec" />
        </div>

        {/* Email capture */}
        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md mb-6"
            aria-label="Join the waitlist"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <label htmlFor="waitlist-email" className="sr-only">Work email address</label>
              <input
                id="waitlist-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors whitespace-nowrap shadow-lg shadow-indigo-900/40"
              >
                Join waitlist
              </button>
            </div>
          </form>
        ) : (
          <div className="w-full max-w-md mb-6 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-6 py-4">
            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm text-emerald-300">
              You're on the list — we'll email you when a spot opens.
            </p>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-2 text-xs text-neutral-600 font-mono">
            <span>{CLAIMED_SPOTS} of {TOTAL_SPOTS} early spots claimed</span>
            <span>{progressPct}%</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${CLAIMED_SPOTS} of ${TOTAL_SPOTS} spots claimed`}
            />
          </div>
        </div>

        {/* Trust line */}
        <p className="text-xs text-neutral-700 mt-4">
          No spam. Unsubscribe any time. We'll only email you when your spot is ready.
        </p>
      </main>

      {/* Minimal footer */}
      <footer className="py-6 px-6 flex items-center justify-center gap-6">
        <a href="https://twitter.com" className="text-neutral-700 hover:text-neutral-500 transition-colors" aria-label="Twitter / X">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <span className="text-xs text-neutral-800">© 2026 Crestline, Inc.</span>
        <a href="#" className="text-xs text-neutral-700 hover:text-neutral-500 transition-colors">Privacy</a>
      </footer>
    </div>
  );
}
```

## Integration hook — how the embedded agent invokes this

When the user asks for "a coming soon page", "launch page", "waitlist page", "pre-launch landing", or "countdown page", follow `docs/templates/12-coming-soon.md`: replace `app/preview/page.tsx` with the provided code; replace "Crestline" with the product name; update `LAUNCH_DATE`, `TOTAL_SPOTS`, and `CLAIMED_SPOTS` constants; update the headline and subtitle to describe the user's product.

## Variations

- **No countdown:** Remove the `CountdownCell` grid and `useCountdown` hook — simplifies the page significantly for products without a hard launch date. Replace with "Launching soon" text.
- **Progress bar only (no countdown):** Keep just the waitlist progress bar and remove the clock entirely — works better for limited-seat betas where the scarcity mechanism is seat count, not time.
- **Light mode:** Swap `neutral-950` bg for `neutral-50`, cards for `white`, borders for `neutral-200`, and accent to `indigo-600` — reads very cleanly as a "product is almost ready" vibe.

## Common pitfalls

- `useCountdown` calls `Date.now()` inside the `calc` closure — if you define `calc` outside the hook without `useCallback`, you'll get stale closure warnings. The version here is defined inside the hook to avoid this.
- `String(value).padStart(2, '0')` pads single digits (e.g., `5` → `'05'`). If you remove `padStart`, the countdown cells will shift widths as numbers change — always pad time units.
- The grid pattern overlay uses an inline `data:` SVG in the `style` attribute — this works in React but JSX requires special URL encoding for `%23` (for `#`). The version here uses `%23ffffff` for white grid lines.
- `LAUNCH_DATE` is a constant in the module — if you deploy this page and want the countdown to work correctly across timezones, always define it in UTC (note the `T09:00:00Z` suffix). Local time creates server/client mismatch with SSR.
- The `submitted` state resets on page reload (no persistence). For a real waitlist, wire the form to an API route and show a persistent success message stored in localStorage or a cookie.
