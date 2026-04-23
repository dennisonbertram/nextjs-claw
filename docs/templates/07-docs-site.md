# 07 — Docs Site

## What this gives you

A three-column developer documentation layout: left sidebar navigation (collapsible sections), center content area (reading-width constrained, heading hierarchy, code blocks), right on-this-page anchor nav. Dark by default with a tasteful light-mode toggle. The design is clean and utility-forward — inspired by Next.js docs, Tailwind CSS docs, and Resend's developer docs: monospace code blocks with subtle `neutral-900` backgrounds, `sm:` max-width prose regions, and persistent prev/next article navigation at the bottom.

## Visual reference

![screenshot](./screenshots/inspiration/nextjs-docs-01.png)
![screenshot](./screenshots/inspiration/tailwind-docs-01.png)

Inspiration URLs (confirmed live 2026-04-23):
- https://nextjs.org/docs — three-column layout, on-this-page nav, code block styling
- https://tailwindcss.com/docs — left sidebar with collapsible sections, typography-forward prose
- https://resend.com/docs — dark palette, monospace code emphasis, breadcrumb + title pattern

## Design tokens

- **Palette:** `neutral-950` bg, `neutral-100` fg, `neutral-800` code block bg, `indigo-400` active link, `neutral-400` inactive nav, `neutral-700` border
- **Typography:** `font-mono text-sm` code, `text-4xl font-bold tracking-tight` page title, `text-2xl font-semibold tracking-tight` h2, `text-lg font-medium` h3; `leading-7` body prose; max `prose` width ~65ch
- **Key ideas:**
  - Three-column grid: `grid-cols-[240px_1fr_200px]` on xl; collapses to single-column on mobile (sidebar becomes a dropdown drawer)
  - Code blocks: `bg-neutral-900 border border-neutral-800 rounded-xl` with a language label badge, line numbers optional
  - On-this-page nav uses sticky positioning and highlights the active heading based on scroll (static version shows all links without active state — agent can add IntersectionObserver if needed)
  - Prev/next pagination with article title at the bottom — same visual weight as a standard link, not a loud CTA button

## Sections (in order)

1. **Top bar** — logo/product name, search button, GitHub link, dark/light toggle, mobile nav trigger
2. **Left sidebar** — collapsible section groups, active page highlighted with indigo left border
3. **Main content** — breadcrumb, page title, intro paragraph, several `<h2>` / `<h3>` sections, inline code, code blocks, callout boxes, prev/next nav
4. **Right sidebar** — "On this page" anchor links, sticky

## Files the agent creates

- `app/preview/page.tsx` — full three-column layout
- `app/preview/layout.tsx` — title + metadata
- `app/preview/globals.css` — prose typography base, code block, dark/light toggle

## Code

### `app/preview/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Getting Started — Vault Docs',
  description: 'Learn how to integrate Vault into your application.',
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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
  --font-mono: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
}

/* Prose reset for docs content area */
.prose h2 { font-size: 1.25rem; font-weight: 600; letter-spacing: -0.015em; margin-top: 2rem; margin-bottom: 0.75rem; color: var(--color-neutral-50); }
.prose h3 { font-size: 1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--color-neutral-100); }
.prose p  { line-height: 1.75; margin-bottom: 1rem; color: var(--color-neutral-300); }
.prose code:not(pre code) {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  background: var(--color-neutral-800);
  border: 1px solid var(--color-neutral-700);
  border-radius: 0.25rem;
  padding: 0.1em 0.35em;
  color: var(--color-indigo-300);
}
.prose ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 1rem; color: var(--color-neutral-300); }
.prose ul li { margin-bottom: 0.35rem; line-height: 1.75; }
.prose a { color: var(--color-indigo-400); text-decoration: underline; text-underline-offset: 2px; }
.prose a:hover { color: var(--color-indigo-300); }
.prose strong { color: var(--color-neutral-100); font-weight: 600; }
```

### `app/preview/page.tsx`

```tsx
'use client';

import { useState } from 'react';

const sidebar = [
  {
    section: 'Getting Started',
    items: [
      { label: 'Introduction',     href: '#intro',   active: false },
      { label: 'Quick start',      href: '#quick',   active: true  },
      { label: 'Installation',     href: '#install', active: false },
      { label: 'Authentication',   href: '#auth',    active: false },
    ],
  },
  {
    section: 'Core Concepts',
    items: [
      { label: 'Workspaces',       href: '#', active: false },
      { label: 'Projects',         href: '#', active: false },
      { label: 'Environments',     href: '#', active: false },
      { label: 'Secrets',          href: '#', active: false },
    ],
  },
  {
    section: 'API Reference',
    items: [
      { label: 'Endpoints',        href: '#', active: false },
      { label: 'Webhooks',         href: '#', active: false },
      { label: 'Rate limits',      href: '#', active: false },
      { label: 'Error codes',      href: '#', active: false },
    ],
  },
  {
    section: 'Guides',
    items: [
      { label: 'CI/CD integration', href: '#', active: false },
      { label: 'Team permissions',  href: '#', active: false },
      { label: 'Audit logging',     href: '#', active: false },
    ],
  },
];

const onThisPage = [
  { label: 'Prerequisites',    href: '#prerequisites' },
  { label: 'Install the SDK',  href: '#install-sdk' },
  { label: 'Initialize client',href: '#init-client' },
  { label: 'Make your first call', href: '#first-call' },
  { label: 'Handle errors',    href: '#errors' },
  { label: 'Next steps',       href: '#next-steps' },
];

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative my-5 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/60">
        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">{lang}</span>
        <button
          onClick={copy}
          className="text-[10px] font-mono text-neutral-600 hover:text-neutral-300 transition-colors"
          aria-label="Copy code"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm font-mono text-neutral-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Callout({ type, children }: { type: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info:    { border: 'border-blue-500/30',  bg: 'bg-blue-500/5',  icon: 'ℹ',  label: 'Note',    text: 'text-blue-300' },
    warning: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', icon: '⚠',  label: 'Warning', text: 'text-amber-300' },
    tip:     { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', icon: '✦', label: 'Tip', text: 'text-emerald-300' },
  }[type];
  return (
    <div className={`my-5 rounded-xl border ${styles.border} ${styles.bg} px-4 py-3`}>
      <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${styles.text}`}>
        <span aria-hidden="true">{styles.icon}</span>
        {styles.label}
      </div>
      <div className="text-sm text-neutral-400 leading-relaxed">{children}</div>
    </div>
  );
}

export default function DocsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sidebar.map((s) => [s.section, true]))
  );

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const SidebarContent = () => (
    <nav aria-label="Documentation navigation" className="py-6 px-3">
      {sidebar.map(({ section, items }) => (
        <div key={section} className="mb-2">
          <button
            onClick={() => toggleSection(section)}
            className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest rounded"
          >
            {section}
            <svg
              className={`w-3 h-3 transition-transform ${openSections[section] ? 'rotate-180' : ''}`}
              viewBox="0 0 12 12" fill="none" aria-hidden="true"
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {openSections[section] && (
            <ul className="mt-0.5 space-y-0.5">
              {items.map(({ label, href, active }) => (
                <li key={label}>
                  <a
                    href={href}
                    className={`flex items-center gap-2 pl-4 pr-2 py-1.5 rounded text-sm transition-colors ${
                      active
                        ? 'text-indigo-400 font-medium border-l-2 border-indigo-500 bg-indigo-500/5 -ml-px pl-[calc(1rem_-_1px)]'
                        : 'text-neutral-500 hover:text-neutral-200'
                    }`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-neutral-800/60 backdrop-blur-md bg-neutral-950/90 h-14 flex items-center px-4 gap-4">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="xl:hidden text-neutral-500 hover:text-neutral-100 p-1 rounded transition-colors"
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <a href="#" className="flex items-center gap-2 font-semibold text-neutral-100">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#6366f1"/>
            <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#818cf8" opacity="0.5"/>
            <rect x="2" y="11" width="7" height="7" rx="1.5" fill="#4f46e5" opacity="0.7"/>
            <rect x="11" y="11" width="7" height="7" rx="1.5" fill="#6366f1" opacity="0.3"/>
          </svg>
          Vault
        </a>
        <span className="text-neutral-700">/</span>
        <span className="text-sm text-neutral-400">Docs</span>

        <div className="ml-auto flex items-center gap-3">
          <button className="hidden sm:flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:border-neutral-700 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Search docs…
            <kbd className="text-[10px] font-mono ml-1 text-neutral-700">⌘K</kbd>
          </button>
          <a
            href="https://github.com"
            className="text-neutral-500 hover:text-neutral-200 transition-colors p-1"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.09.68-.22.68-.48v-1.69c-2.782.6-3.369-1.34-3.369-1.34-.454-1.16-1.11-1.46-1.11-1.46-.908-.62.069-.61.069-.61 1.003.07 1.532 1.03 1.532 1.03.892 1.53 2.341 1.09 2.91.83.09-.65.35-1.09.636-1.34-2.22-.25-4.555-1.11-4.555-4.94 0-1.09.39-1.98 1.03-2.68-.103-.25-.447-1.27.098-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 6.8c.85.004 1.705.115 2.504.337 1.909-1.29 2.747-1.02 2.747-1.02.547 1.37.203 2.39.1 2.64.64.7 1.028 1.59 1.028 2.68 0 3.84-2.339 4.68-4.566 4.93.359.31.678.92.678 1.85v2.75c0 .26.18.57.688.47A10.02 10.02 0 0022 12c0-5.523-4.477-10-10-10z"/>
            </svg>
          </a>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* Left sidebar — desktop */}
        <aside className="hidden xl:block w-60 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-neutral-800/60">
          <SidebarContent />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="xl:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
            <div className="relative z-10 w-72 h-full bg-neutral-950 border-r border-neutral-800 overflow-y-auto">
              <SidebarContent />
            </div>
          </div>
        )}

        {/* Main article */}
        <main className="flex-1 min-w-0 px-6 py-10 max-w-3xl mx-auto xl:mx-0">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-neutral-600 mb-4">
            <a href="#" className="hover:text-neutral-400 transition-colors">Docs</a>
            <span>/</span>
            <a href="#" className="hover:text-neutral-400 transition-colors">Getting Started</a>
            <span>/</span>
            <span className="text-neutral-400">Quick start</span>
          </nav>

          <h1 id="intro" className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-50 mb-3">
            Quick start
          </h1>
          <p className="text-neutral-400 text-base leading-7 mb-8">
            Get your first secret stored and retrieved in under five minutes. This guide assumes
            you have a Vault workspace — if not, <a href="#" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">create one first</a>.
          </p>

          <div className="prose">
            <h2 id="prerequisites">Prerequisites</h2>
            <p>
              Before you start, make sure you have the following installed on your machine:
            </p>
            <ul>
              <li>Node.js 18 or later (we recommend the latest LTS)</li>
              <li>A Vault workspace with at least one environment configured</li>
              <li>Your workspace API key (found in <strong>Settings → API Keys</strong>)</li>
            </ul>

            <Callout type="tip">
              If you're evaluating Vault, use the <code>sandbox</code> environment — it's isolated from production and automatically resets every 24 hours.
            </Callout>

            <h2 id="install-sdk">Install the SDK</h2>
            <p>Install the Vault Node SDK using your preferred package manager:</p>
          </div>

          <CodeBlock lang="bash" code={`# npm
npm install @vault/sdk --save-exact

# bun
bun add -E @vault/sdk

# pnpm
pnpm add --save-exact @vault/sdk`} />

          <div className="prose">
            <h2 id="init-client">Initialize the client</h2>
            <p>
              Create a client instance using your API key. We strongly recommend storing credentials
              in environment variables, never in source code.
            </p>
          </div>

          <CodeBlock lang="typescript" code={`import { VaultClient } from '@vault/sdk';

const vault = new VaultClient({
  apiKey: process.env.VAULT_API_KEY!,
  environment: 'production', // or 'sandbox' for testing
});`} />

          <div className="prose">
            <Callout type="warning">
              Never commit your API key to source control. Use a <code>.env.local</code> file (add it to <code>.gitignore</code>) or your deployment platform's secret manager.
            </Callout>

            <h2 id="first-call">Make your first call</h2>
            <p>
              Store a secret and retrieve it back. Secrets are versioned automatically — each
              update creates a new version while preserving the history.
            </p>
          </div>

          <CodeBlock lang="typescript" code={`// Store a secret
await vault.secrets.set('DATABASE_URL', 'postgres://user:pass@host/db');

// Retrieve the latest version
const { value } = await vault.secrets.get('DATABASE_URL');
console.log(value); // postgres://user:pass@host/db

// Retrieve all secrets for an environment as a flat object
const env = await vault.secrets.all();
// { DATABASE_URL: '...', STRIPE_KEY: '...', ... }`} />

          <div className="prose">
            <h2 id="errors">Handle errors</h2>
            <p>
              The SDK throws typed errors for all failure scenarios. Wrap calls in <code>try/catch</code> or use the result pattern:
            </p>
          </div>

          <CodeBlock lang="typescript" code={`import { VaultError, NotFoundError, RateLimitError } from '@vault/sdk';

try {
  const { value } = await vault.secrets.get('MISSING_KEY');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.error('Secret not found:', err.key);
  } else if (err instanceof RateLimitError) {
    console.error('Rate limit hit, retry after:', err.retryAfter);
  } else if (err instanceof VaultError) {
    console.error('Vault error:', err.message, err.code);
  } else {
    throw err; // re-throw unknown errors
  }
}`} />

          <div className="prose">
            <h2 id="next-steps">Next steps</h2>
            <p>You've stored your first secret. Here's what to explore next:</p>
            <ul>
              <li><a href="#">Environments</a> — separate dev, staging, and production secrets</li>
              <li><a href="#">Access controls</a> — grant fine-grained permissions to teammates</li>
              <li><a href="#">Webhooks</a> — react to secret rotation events in real time</li>
              <li><a href="#">CI/CD integration guide</a> — inject secrets into GitHub Actions or Vercel builds</li>
            </ul>
          </div>

          {/* Prev / Next navigation */}
          <div className="mt-12 pt-6 border-t border-neutral-800/60 grid grid-cols-2 gap-4">
            <a href="#" className="group flex flex-col items-start p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
              <span className="text-xs text-neutral-600 mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Previous
              </span>
              <span className="text-sm font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors">Introduction</span>
            </a>
            <a href="#" className="group flex flex-col items-end p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors text-right">
              <span className="text-xs text-neutral-600 mb-1 flex items-center gap-1">
                Next
                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <span className="text-sm font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors">Installation</span>
            </a>
          </div>
        </main>

        {/* Right sidebar — on this page */}
        <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-10 pl-6">
          <div>
            <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-3">On this page</p>
            <ul className="space-y-1.5">
              {onThisPage.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors leading-relaxed block"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
```

## Integration hook — how the embedded agent invokes this

When the user asks for "a docs site", "documentation page", "developer docs", "API reference layout", or "SDK documentation", follow `docs/templates/07-docs-site.md`: replace `app/preview/page.tsx` with the provided code; rename "Vault" to the user's product name; update `sidebar` sections and items to match the documentation structure the user describes; update the article content to reflect the user's product and API.

## Variations

- **Light mode:** Add a `useState` dark/light toggle — swap `html.dark` class on/off. The existing CSS variables in `globals.css` can be made conditional with a `.dark {}` selector block.
- **Algolia/Docsearch integration:** Replace the search button with the Docsearch modal trigger — `bun add -E @docsearch/react`, add the CSS import, swap the button for `<DocSearch>` component with your `appId`, `apiKey`, `indexName`.
- **Multi-product sidebar:** Add a top-level product switcher (dropdown) above the nav — clicking "API Reference" vs "Guides" reloads the `sidebar` data and scrolls to top of main content.

## Common pitfalls

- The three-column layout uses `max-w-[1400px]` on the container and `sticky top-14` on both sidebars — both sidebars need explicit `h-[calc(100vh-3.5rem)]` or they won't scroll independently of the main content.
- The `.prose` class is a custom CSS class in `globals.css`, not Tailwind's official `@tailwindcss/typography` plugin — if you later add `@tailwindcss/typography`, rename this class to avoid conflicts.
- `CodeBlock` uses `navigator.clipboard.writeText` which requires HTTPS or `localhost` — in the preview, this fails silently on non-secure origins. Add a `try/catch` around the clipboard call if needed.
- The `openSections` state initializer maps all sections to `true` (expanded) by default. On mobile, initializing them all `false` (collapsed) improves first-load experience — consider `window.innerWidth < 768 ? false : true` in the initializer.
- The left sidebar's active item uses `border-l-2 border-indigo-500` with `-ml-px pl-[calc(1rem_-_1px)]` to visually align the left border without shifting the text. Removing `-ml-px` creates a visible 1px indent — cosmetically minor but noticeable at 2x display density.
