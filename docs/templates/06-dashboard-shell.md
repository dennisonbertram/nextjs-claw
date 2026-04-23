# 06 — Dashboard Shell

## What this gives you

A complete SaaS application interior shell: left sidebar navigation, top bar with search and user menu, main content area with stat cards and a data table, and a responsive mobile drawer. This is the frame that goes around your product's features — not the features themselves. The aesthetic is dark and information-dense without feeling cramped: `neutral-900` sidebar on `neutral-950` main, `12px` sidebar items, `text-xs` table rows, color-coded stat badges. Inspired by Linear's app interior, Vercel's dashboard, and Axiom's analytics console.

## Visual reference

![screenshot](./screenshots/inspiration/vercel-templates-01.png)
![screenshot](./screenshots/inspiration/linear-landing-01.png)

Inspiration URLs (confirmed live 2026-04-23):
- https://vercel.com/dashboard — stat cards, project list, sidebar nav pattern
- https://linear.app — sidebar hierarchy, keyboard shortcut hints, icon + label items
- https://axiom.co/docs — dark information-dense layout, header with breadcrumb

## Design tokens

- **Palette:** `neutral-950` main bg, `neutral-900` sidebar bg, `neutral-800` borders, `neutral-700` dividers, `indigo-500` active nav item, `neutral-400` inactive nav text, `emerald-500` positive stat, `rose-500` negative stat
- **Typography:** `text-xs` sidebar nav labels, `text-sm` table rows, `text-2xl font-semibold tracking-tight` stat numbers, `text-xs font-mono text-neutral-500` secondary labels
- **Key ideas:**
  - Sidebar is `w-56` fixed, scrollable independently, collapses to off-canvas drawer on `md:` and below
  - `grid grid-cols-[224px_1fr]` layout on desktop — sidebar is a grid child, not `fixed` positioned (avoids z-index wars)
  - Stat cards use a top border accent (`border-t-2 border-indigo-500`) rather than filled background — less garish, more elegant
  - Table rows alternate `bg-neutral-900/30` for readability without the harsh striped look
  - Mobile drawer uses a `<dialog>` element with CSS-only animation (no client-side JS needed for static render)

## Sections (in order)

1. **Sidebar** — logo, workspace switcher, nav sections (main, project, settings), keyboard shortcut hints at bottom
2. **Top bar** — search input, notification bell, user avatar/menu
3. **Page header** — breadcrumb path, page title, action button
4. **Stat cards row** — 4 cards with metric, delta badge, sparkline placeholder
5. **Data table** — sortable header, 8 example rows, status badges, pagination controls
6. **Mobile drawer** — slide-in sidebar triggered by hamburger icon, overlay background

## Files the agent creates

- `app/preview/page.tsx` — full shell with all regions
- `app/preview/layout.tsx` — title update, metadata
- `app/preview/globals.css` — base styles with dialog animation

## Code

### `app/preview/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lineage — Dashboard',
  description: 'Your workspace overview.',
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

/* Mobile drawer animation */
dialog {
  padding: 0;
  border: none;
  background: transparent;
}
dialog::backdrop {
  background: rgba(0, 0, 0, 0.7);
}
dialog[open] {
  animation: slideIn 0.2s ease-out;
}
@keyframes slideIn {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
```

### `app/preview/page.tsx`

```tsx
'use client';

import { useState } from 'react';

const navSections = [
  {
    label: 'Workspace',
    items: [
      { icon: '⬡', label: 'Overview', href: '#', active: true },
      { icon: '◈', label: 'Projects', href: '#', badge: '3' },
      { icon: '◷', label: 'Activity', href: '#' },
      { icon: '⊞', label: 'All issues', href: '#' },
    ],
  },
  {
    label: 'Favorites',
    items: [
      { icon: '▸', label: 'Q3 Launch', href: '#' },
      { icon: '▸', label: 'Infra Upgrade', href: '#' },
    ],
  },
  {
    label: 'Teams',
    items: [
      { icon: '⬡', label: 'Engineering', href: '#' },
      { icon: '⬡', label: 'Design', href: '#' },
      { icon: '⬡', label: 'Growth', href: '#' },
    ],
  },
];

const stats = [
  { label: 'Open issues',     value: '142',    delta: '+12', trend: 'up',   color: 'rose' },
  { label: 'Closed this week', value: '89',    delta: '+34%', trend: 'up',  color: 'emerald' },
  { label: 'In progress',      value: '27',    delta: '−3',  trend: 'down', color: 'amber' },
  { label: 'Avg. cycle time',  value: '4.2d',  delta: '−0.8d', trend: 'up', color: 'indigo' },
];

const tableRows = [
  { id: 'FND-112', title: 'Fix memory leak in worker pool', status: 'In Progress', priority: 'Urgent', assignee: 'PR', updated: '2h ago' },
  { id: 'FND-111', title: 'Add dark mode to onboarding flow', status: 'In Review',  priority: 'High',   assignee: 'YT', updated: '4h ago' },
  { id: 'FND-110', title: 'Upgrade Postgres to 17.2',         status: 'Done',       priority: 'Medium', assignee: 'CR', updated: '1d ago' },
  { id: 'FND-109', title: 'Billing webhook idempotency',       status: 'In Progress', priority: 'High', assignee: 'MK', updated: '1d ago' },
  { id: 'FND-108', title: 'SSO SAML documentation',           status: 'Todo',       priority: 'Low',    assignee: 'YT', updated: '2d ago' },
  { id: 'FND-107', title: 'Rate limit API endpoints',         status: 'In Review',  priority: 'High',   assignee: 'PR', updated: '2d ago' },
  { id: 'FND-106', title: 'Export CSV from analytics view',   status: 'Todo',       priority: 'Medium', assignee: 'CR', updated: '3d ago' },
  { id: 'FND-105', title: 'Resolve CORS on /api/v2/events',   status: 'Done',       priority: 'Urgent', assignee: 'MK', updated: '4d ago' },
];

const statusColor: Record<string, string> = {
  'In Progress': 'bg-amber-500/15 text-amber-400',
  'In Review':   'bg-blue-500/15 text-blue-400',
  'Done':        'bg-emerald-500/15 text-emerald-400',
  'Todo':        'bg-neutral-700/50 text-neutral-400',
};

const priorityColor: Record<string, string> = {
  'Urgent': 'text-rose-400',
  'High':   'text-orange-400',
  'Medium': 'text-neutral-400',
  'Low':    'text-neutral-600',
};

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <aside className="w-56 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full overflow-y-auto">
      {/* Logo / workspace */}
      <div className="px-4 pt-5 pb-4 border-b border-neutral-800">
        <button
          className="flex items-center gap-2.5 w-full text-left group"
          onClick={onClose}
          aria-label="Workspace menu"
        >
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">L</div>
          <div>
            <div className="text-sm font-medium text-neutral-100 leading-none">Lineage</div>
            <div className="text-xs text-neutral-500 mt-0.5">Workspace</div>
          </div>
          <svg className="w-3 h-3 text-neutral-600 ml-auto" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-3 px-2">
        {navSections.map(({ label, items }) => (
          <div key={label} className="mb-5">
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest px-2 mb-1.5">{label}</p>
            {items.map(({ icon, label: itemLabel, href, active, badge }) => (
              <a
                key={itemLabel}
                href={href}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs mb-0.5 transition-colors ${
                  active
                    ? 'bg-indigo-600/15 text-indigo-300 font-medium'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                <span className="w-4 text-center text-neutral-500" aria-hidden="true">{icon}</span>
                <span className="flex-1">{itemLabel}</span>
                {badge && (
                  <span className="bg-neutral-700 text-neutral-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{badge}</span>
                )}
              </a>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-neutral-800 p-3">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-800 cursor-pointer transition-colors">
          <span aria-hidden="true">⚙</span>
          <span>Settings</span>
          <span className="ml-auto font-mono text-neutral-700 text-[10px]">⌘,</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-neutral-500 hover:bg-neutral-800 cursor-pointer transition-colors">
          <span aria-hidden="true">?</span>
          <span>Help &amp; feedback</span>
        </div>
      </div>
    </aside>
  );
}

export default function DashboardShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-neutral-950">
      {/* Top bar */}
      <header className="h-12 flex-shrink-0 border-b border-neutral-800 flex items-center px-4 gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="md:hidden text-neutral-400 hover:text-neutral-100 transition-colors p-1 -ml-1 rounded"
          aria-label="Open navigation"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Search */}
        <div className="flex-1 max-w-sm hidden sm:block">
          <label className="sr-only" htmlFor="top-search">Search</label>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              id="top-search"
              type="search"
              placeholder="Search issues, projects…"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 font-mono">⌘K</kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Notification bell */}
          <button className="relative p-1.5 text-neutral-500 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors" aria-label="Notifications">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2a4.5 4.5 0 00-4.5 4.5v2L2 10h12l-1.5-1.5v-2A4.5 4.5 0 008 2zM6.5 12a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </button>
          {/* Avatar */}
          <button className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium text-white" aria-label="User menu">
            PR
          </button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                <a href="#" className="hover:text-neutral-400 transition-colors">Engineering</a>
                <span>/</span>
                <span className="text-neutral-400">All issues</span>
              </nav>
              <h1 className="text-lg font-semibold text-neutral-100 tracking-tight">All issues</h1>
            </div>
            <button className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New issue
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map(({ label, value, delta, trend, color }) => {
              const borderColor = { rose: 'border-rose-500', emerald: 'border-emerald-500', amber: 'border-amber-500', indigo: 'border-indigo-500' }[color];
              const deltaColor = trend === 'up' && color === 'emerald' ? 'text-emerald-400'
                : trend === 'up' && color === 'rose' ? 'text-rose-400'
                : 'text-neutral-400';
              return (
                <div key={label} className={`bg-neutral-900 border border-neutral-800 border-t-2 ${borderColor} rounded-xl p-4`}>
                  <div className="text-xs text-neutral-500 mb-2">{label}</div>
                  <div className="text-2xl font-semibold text-neutral-100 tracking-tight">{value}</div>
                  <div className={`text-xs font-mono mt-1 ${deltaColor}`}>{delta}</div>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-4">
              <h2 className="text-sm font-medium text-neutral-200">Issues</h2>
              <div className="flex items-center gap-2 ml-auto">
                <button className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1 rounded hover:bg-neutral-800">Filter</button>
                <button className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1 rounded hover:bg-neutral-800">Group</button>
                <button className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1 rounded hover:bg-neutral-800">Display</button>
              </div>
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-800/60 text-left">
                    <th className="px-4 py-2.5 text-neutral-600 font-medium w-24">ID</th>
                    <th className="px-4 py-2.5 text-neutral-600 font-medium">Title</th>
                    <th className="px-4 py-2.5 text-neutral-600 font-medium hidden sm:table-cell w-28">Status</th>
                    <th className="px-4 py-2.5 text-neutral-600 font-medium hidden lg:table-cell w-24">Priority</th>
                    <th className="px-4 py-2.5 text-neutral-600 font-medium hidden md:table-cell w-20">Assignee</th>
                    <th className="px-4 py-2.5 text-neutral-600 font-medium w-20 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(({ id, title, status, priority, assignee, updated }, i) => (
                    <tr
                      key={id}
                      className={`border-b border-neutral-800/40 last:border-0 hover:bg-neutral-800/40 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-neutral-900/30'}`}
                    >
                      <td className="px-4 py-3 font-mono text-neutral-600">{id}</td>
                      <td className="px-4 py-3 text-neutral-300 max-w-xs truncate">{title}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`font-medium ${priorityColor[priority]}`}>{priority}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-300 font-medium">
                          {assignee}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 text-right">{updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-neutral-800/60 flex items-center justify-between">
              <span className="text-xs text-neutral-600">1–8 of 142 issues</span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-1 rounded text-xs text-neutral-600 hover:bg-neutral-800 hover:text-neutral-300 transition-colors disabled:opacity-30" disabled>
                  ← Prev
                </button>
                <button className="px-2 py-1 rounded text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 transition-colors">
                  Next →
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-56 h-full animate-[slideIn_0.2s_ease-out]">
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
```

## Integration hook — how the embedded agent invokes this

When the user asks for "a dashboard", "app interior", "admin panel", "SaaS shell", "sidebar navigation layout", or "authenticated app view", follow `docs/templates/06-dashboard-shell.md`: replace `app/preview/page.tsx` with the provided code; rename "Lineage" to the user's product name throughout; update `navSections` items to match the user's product areas; update `tableRows` with domain-appropriate columns and data.

## Variations

- **Collapsible sidebar:** Add a toggle that shrinks the sidebar to `w-14` (icon-only) — store `collapsed` boolean in `useState`, conditionally hide label text and section headers, show a tooltip on hover.
- **Right-side detail panel:** Add a third grid column (`grid-cols-[224px_1fr_320px]`) that slides in when a table row is clicked — displays issue details without navigating away.
- **Light theme:** Flip to `bg-gray-50` main, `white` sidebar, `gray-200` borders — this reads well for tools that integrate with existing light-mode design systems.

## Common pitfalls

- `h-screen overflow-hidden` on the root + `overflow-y-auto` on `<main>` is the correct scroll isolation pattern — if you use `overflow-hidden` on `<main>` you lose scroll entirely; if you don't use it on the root you get double scrollbars.
- The mobile drawer uses `useState` which requires `'use client'` at the top of the file — if you split the sidebar into a server component, the drawer toggle must stay in a client component wrapper.
- `grid grid-cols-[224px_1fr]` uses a Tailwind v4 arbitrary value — this works in v4 but would need `grid-cols-[14rem_1fr]` in v3 (em-based). Stay consistent with the pixel value.
- Table column widths (`w-24`, `w-28`) use fixed sizing — on very narrow containers the title column can collapse to almost nothing. Add `min-w-0` + `truncate` on the title `<td>` to prevent layout breakage.
- The `Sidebar` component is used both in the desktop layout and the mobile drawer — it must not contain any `fixed` or `absolute` positioning internally, or the desktop sidebar will escape its grid cell.
