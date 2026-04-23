# Template Recipes

Visual and structural starter shapes for the embedded Claude agent in `nextjs-claw`. Each recipe is a complete, copy-pasteable Next.js + Tailwind v4 page the agent drops into `app/preview/` when a user asks for a specific kind of site.

## How the agent uses these

When a user types a request like "make me a SaaS landing page" or "give me a pricing page", the agent:

1. Identifies the matching recipe category from the index below
2. Reads the corresponding `.md` file to find the **Integration hook** section
3. Copies `app/preview/page.tsx` (and optionally `layout.tsx` / `globals.css`) from the **Code** section
4. Makes targeted substitutions: product name, copy, colors, data arrays
5. Writes the files via tool calls — Next.js hot-reload shows the result immediately in the preview frame

All recipes produce working TSX with no external dependencies. They use:
- Next.js 16 (App Router)
- React 19 with `'use client'` for interactive components
- Tailwind v4 utilities exclusively (no `tailwind.config.ts`, no CSS libs)
- Semantic HTML with proper ARIA attributes
- Responsive layouts tested at 360px (mobile), 768px (tablet), 1280px (desktop)

---

## Recipe Index

| # | Template | Best for | Screenshot |
|---|----------|----------|-----------|
| 01 | [SaaS Landing Page](./01-saas-landing.md) | Product launches, developer tools, B2B SaaS | ![](./screenshots/inspiration/linear-landing-01.png) |
| 02 | [Pricing Page](./02-pricing-page.md) | Subscription plans, tiered SaaS pricing, feature comparison | ![](./screenshots/inspiration/vercel-pricing-01.png) |
| 03 | [Developer/Designer Portfolio](./03-portfolio-dev.md) | Freelancers, open-source authors, job seekers | ![](./screenshots/inspiration/vercel-templates-01.png) |
| 04 | [Photography Portfolio](./04-portfolio-photo.md) | Photographers, visual artists, illustrators | ![](./screenshots/inspiration/anthropic-landing-01.png) |
| 05 | [Blog / Editorial](./05-blog-editorial.md) | Writers, company blogs, independent publications | ![](./screenshots/inspiration/ghost-landing-01.png) |
| 06 | [Dashboard Shell](./06-dashboard-shell.md) | SaaS app interiors, admin panels, analytics tools | ![](./screenshots/inspiration/vercel-templates-01.png) |
| 07 | [Docs Site](./07-docs-site.md) | Developer documentation, SDK reference, API guides | ![](./screenshots/inspiration/nextjs-docs-01.png) |
| 08 | [Agency / Consulting](./08-agency.md) | Design studios, consulting firms, creative agencies | ![](./screenshots/inspiration/anthropic-landing-01.png) |
| 09 | [Restaurant / Local Business](./09-restaurant-local.md) | Restaurants, cafés, bakeries, local businesses | ![](./screenshots/inspiration/resend-landing-01.png) |
| 10 | [Event / Conference](./10-event-conference.md) | Tech conferences, workshops, hackathons, summits | ![](./screenshots/inspiration/framer-templates-01.png) |
| 11 | [Newsletter / Creator](./11-newsletter-creator.md) | Newsletter sites, personal writing brands, Substack alternatives | ![](./screenshots/inspiration/ghost-landing-01.png) |
| 12 | [Coming Soon / Waitlist](./12-coming-soon.md) | Pre-launch products, private betas, feature waitlists | ![](./screenshots/inspiration/resend-landing-01.png) |

---

## Design Principles (applied across all recipes)

**2026 aesthetic conventions:**
- Dark-first (`neutral-950` bg) with selective use of `neutral-900` for card/sidebar surfaces
- `tracking-tight` on headings of `text-3xl` and above — never on body copy
- Mesh/blob gradients for hero sections: multiple `blur-3xl` divs with opacity, inside `overflow-hidden`
- `backdrop-blur-md bg-neutral-950/80` on sticky navbars — the "frosted glass" pattern
- Tailwind v4 arbitrary values (e.g., `grid-cols-[240px_1fr_200px]`) used freely for layout
- `font-mono text-xs uppercase tracking-widest` for section labels / eyebrows

**Accessibility baselines in every recipe:**
- All interactive elements have visible focus states (Tailwind `focus:outline-none focus:ring-1 focus:border-*`)
- Images always have `alt` text
- Form inputs are always associated with `<label>` (visible or `sr-only`)
- Decorative elements have `aria-hidden="true"`
- Color is never the sole means of conveying information

**Mobile-first patterns:**
- Layouts start `grid-cols-1` and step up at `md:` or `lg:` breakpoints
- Tables become stacked card views below `md:`
- Sidebars become off-canvas drawers below `xl:` (docs) or `md:` (dashboard)
- Floating CTAs for the most critical action on mobile (event tickets, etc.)

---

## Placeholder assets

**Product/brand names used** (all fictional, feel free to rename):
`Foundry`, `Harbor`, `Lineage`, `Vault`, `Crestline`, `Axiom`, `Meridian`, `Clave Studio`

**Unsplash photo IDs used** (all verified 200 OK as of 2026-04-23):
| ID | Subject | Used in |
|----|---------|---------|
| `photo-1618005182384-a83a8bd57fbe` | Abstract/colorful | SaaS hero mock |
| `photo-1557804506-669a67965ba0` | Data/light trails | Blog featured |
| `photo-1504674900247-0877df9cc836` | Food/meal | Restaurant hero |
| `photo-1492691527719-9d1e07e534b4` | Mountain landscape | Photo portfolio |
| `photo-1545665277-5937489579f2` | Studio/abstract | Photo gallery |
| `photo-1486312338219-ce68d2c6f44d` | Workspace/laptop | Photo gallery |
| `photo-1499951360447-b19be8fe80f5` | Developer laptop | Blog + portfolio |
| `photo-1540575467063-178a50c2df87` | Conference hall | Event hero |

Always append `?w=<width>&q=80` to Unsplash URLs in production code to avoid serving full-res originals.

---

## Adding a new recipe

1. Create `docs/templates/NN-slug.md` following the format below
2. Capture ≥2 inspiration screenshots to `docs/templates/screenshots/inspiration/`
3. Verify all Unsplash photo IDs with `agent-browser open <url>` before use
4. Add a row to the index table above
5. Commit: `docs(templates): add <slug> recipe`

### Required recipe sections

```
# NN — Template Name
## What this gives you
## Visual reference
## Design tokens
## Sections (in order)
## Files the agent creates
## Code        ← three full code blocks: layout.tsx, globals.css, page.tsx
## Integration hook — how the embedded agent invokes this
## Variations
## Common pitfalls
```

---

## Functional capabilities (backend)

This directory is visual/structural recipes only. For auth, database, email, and other backend capabilities, see [`docs/stack/`](../stack/) — the functional cookbook produced alongside these templates.

---

*Recipes produced 2026-04-23. Tailwind v4.2.4, Next.js 16.2.4, React 19.2.4.*
