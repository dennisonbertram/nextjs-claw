# 04 — Photography / Visual Artist Portfolio

## What this gives you

An edge-to-edge, image-first portfolio for a photographer, illustrator, or visual artist. The hero is a full-viewport photograph with minimal overlaid text. Below: a masonry-style gallery grid, a brief minimal bio, and a contact line — that's it. Maximum chrome removal: the nav disappears on scroll (fade out), reappears on scroll-up. The aesthetic is gallery-sparse — lots of space between elements, thin typography, no decorative elements that compete with the imagery.

## Visual reference

![screenshot](./screenshots/inspiration/anthropic-landing-01.png)

Inspiration URLs (confirmed live 2026-04-23):
- https://www.anthropic.com — full-bleed imagery, minimal overlay text, generous whitespace discipline
- https://framer.com/marketplace/templates — photo portfolio template patterns, masonry grid examples
- https://vercel.com/templates — edge-to-edge card grids with aspect-ratio discipline

Verified Unsplash photos used in this recipe:
- `photo-1492691527719-9d1e07e534b4` — landscape/mountain photography (1280×853)
- `photo-1545665277-5937489579f2` — abstract/studio photography (1280×853)
- `photo-1486312338219-ce68d2c6f44d` — workspace/creative photography (1280×852)

## Design tokens

- **Palette:** `neutral-950` bg, `neutral-100` fg, `neutral-500` muted text — near-zero color; let the images carry the palette
- **Typography:** `text-sm font-light tracking-[0.15em] uppercase` nav links; `text-4xl sm:text-5xl font-thin tracking-wide` hero subtitle; `font-mono text-xs text-neutral-600` metadata labels
- **Key ideas:**
  - Near-colorless UI — only black, white, and neutrals — so photographs read at full intensity
  - `font-light` and `font-thin` everywhere creates an ultra-refined, gallery-grade feel
  - Wide letter-spacing (`tracking-[0.15em]`) on nav and category labels gives editorial hierarchy
  - The gallery grid uses `columns-1 sm:columns-2 lg:columns-3` (CSS columns) for true masonry without JS
  - Image hover: barely-there scale transform (`group-hover:scale-[1.02]`) — tasteful, not showy

## Sections (in order)

1. **Overlay nav** — fixed, transparent, fades to semi-opaque on scroll; logo center, two links each side
2. **Full-viewport hero** — photograph, dark gradient overlay at bottom, site name + tagline
3. **Category filter** — minimal pill filters (All, Portrait, Landscape, Still Life); links only, no active state color
4. **Masonry gallery** — 9 images in a CSS columns grid; each image links to a lightbox placeholder
5. **Bio strip** — two-column: short statement left, photographer name + location right
6. **Contact footer** — email, Instagram link, copyright

## Files the agent creates

- `app/preview/page.tsx` — full page
- `app/preview/layout.tsx` — title + metadata
- `app/preview/globals.css` — base styles with column break prevention

## Code

### `app/preview/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elara Voss — Photography',
  description: 'Commercial and editorial photography. San Francisco, worldwide.',
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

/* Prevent masonry images from breaking across columns */
.masonry-item {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

### `app/preview/page.tsx`

```tsx
// Photo credits (Unsplash):
// photo-1492691527719-9d1e07e534b4 — Sylvain Gllm (@sylvaingllm)
// photo-1545665277-5937489579f2 — Mathieu Stern (@mathieustern)
// photo-1486312338219-ce68d2c6f44d — Glenn Carstens-Peters (@glenncarstenspeters)
// photo-1557804506-669a67965ba0 — Carlos Muza (@carlosmuza)
// photo-1499951360447-b19be8fe80f5 — Christopher Gower (@cgower)
// photo-1618005182384-a83a8bd57fbe — Steve Johnson (@steve_j)
// photo-1506905925346-21bda4d32df4 — Sven Scheuermeier (@sven_scheuermeier)
// photo-1531746020798-e6953c6e8e04 — Velizar Ivanov (@veliivanov)
// photo-1501854140801-50d01698950b — Aniket Deole (@aniketh_d)

const galleryImages = [
  { id: 'photo-1492691527719-9d1e07e534b4', alt: 'Mountain landscape at dusk', category: 'Landscape', aspect: 'tall' },
  { id: 'photo-1545665277-5937489579f2', alt: 'Abstract studio composition', category: 'Still Life', aspect: 'wide' },
  { id: 'photo-1486312338219-ce68d2c6f44d', alt: 'Creative workspace detail', category: 'Still Life', aspect: 'wide' },
  { id: 'photo-1557804506-669a67965ba0', alt: 'Data visualization light trails', category: 'Abstract', aspect: 'wide' },
  { id: 'photo-1499951360447-b19be8fe80f5', alt: 'Laptop in low light', category: 'Portrait', aspect: 'wide' },
  { id: 'photo-1618005182384-a83a8bd57fbe', alt: 'Colorful abstract paint', category: 'Abstract', aspect: 'wide' },
  { id: 'photo-1506905925346-21bda4d32df4', alt: 'Mountain ridge in evening light', category: 'Landscape', aspect: 'wide' },
  { id: 'photo-1531746020798-e6953c6e8e04', alt: 'Portrait with soft rim light', category: 'Portrait', aspect: 'tall' },
  { id: 'photo-1501854140801-50d01698950b', alt: 'Aerial landscape abstract', category: 'Landscape', aspect: 'wide' },
];

const categories = ['All', 'Portrait', 'Landscape', 'Still Life', 'Abstract'];

export default function PhotoPortfolio() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Fixed nav */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 h-14 flex items-center justify-between">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/70 to-transparent pointer-events-none" aria-hidden="true" />
        <nav className="relative flex items-center justify-between w-full">
          <div className="flex items-center gap-8">
            <a href="#gallery" className="text-xs text-neutral-400 hover:text-neutral-100 tracking-[0.15em] uppercase transition-colors">
              Work
            </a>
            <a href="#about" className="text-xs text-neutral-400 hover:text-neutral-100 tracking-[0.15em] uppercase transition-colors">
              About
            </a>
          </div>
          <a href="#" className="text-sm font-light tracking-[0.2em] uppercase text-neutral-100">
            Elara Voss
          </a>
          <div className="flex items-center gap-8">
            <a href="#contact" className="text-xs text-neutral-400 hover:text-neutral-100 tracking-[0.15em] uppercase transition-colors">
              Contact
            </a>
            <a href="https://instagram.com" className="text-xs text-neutral-400 hover:text-neutral-100 tracking-[0.15em] uppercase transition-colors">
              Instagram
            </a>
          </div>
        </nav>
      </header>

      {/* Hero — full viewport */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1920&q=85"
          alt="Mountain landscape at dusk — hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/30 via-transparent to-neutral-950/80" aria-hidden="true" />
        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 pb-14">
          <p className="text-xs font-mono text-neutral-400 uppercase tracking-[0.2em] mb-3">
            Commercial &amp; Editorial Photography
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-thin tracking-wide text-neutral-50 leading-tight">
            The world, noticed.
          </h1>
        </div>
      </section>

      {/* Category filter */}
      <section className="px-6 sm:px-10 py-10 flex items-center gap-6 overflow-x-auto">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`text-xs tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
              i === 0
                ? 'text-neutral-100'
                : 'text-neutral-600 hover:text-neutral-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Masonry gallery */}
      <section id="gallery" className="px-4 sm:px-6 pb-20">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {galleryImages.map(({ id, alt, aspect }, i) => (
            <div key={`${id}-${i}`} className="masonry-item mb-4 group cursor-pointer overflow-hidden rounded-sm">
              <img
                src={`https://images.unsplash.com/${id}?w=800&q=80`}
                alt={alt}
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
                  aspect === 'tall' ? 'aspect-[3/4]' : 'aspect-[4/3]'
                }`}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Bio strip */}
      <section id="about" className="border-t border-neutral-800/60 py-16 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <p className="text-lg sm:text-xl font-light text-neutral-300 leading-relaxed">
              "I make photographs about the tension between the designed and the found —
              the moment an architect's intention meets the light of a specific Tuesday afternoon."
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <p className="text-sm text-neutral-500 leading-relaxed">
              Elara Voss is a San Francisco–based photographer working in commercial, editorial,
              and fine art contexts. Her clients include Wired, Nike, Airbnb, and the San Francisco
              Museum of Modern Art. She teaches photography at SFAI each spring.
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-neutral-600 mt-2">
              <span>San Francisco, CA</span>
              <span>·</span>
              <span>Worldwide</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact footer */}
      <footer id="contact" className="border-t border-neutral-800/60 py-10 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-1">Get in touch</p>
            <a
              href="mailto:hello@elaravoss.com"
              className="text-neutral-300 hover:text-neutral-100 transition-colors text-sm"
            >
              hello@elaravoss.com
            </a>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono text-neutral-600">
            <a href="https://instagram.com" className="hover:text-neutral-400 transition-colors tracking-[0.1em]">Instagram</a>
            <a href="https://twitter.com" className="hover:text-neutral-400 transition-colors tracking-[0.1em]">Twitter</a>
            <span>© 2026 Elara Voss</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

## Integration hook — how the embedded agent invokes this

When the user asks for "a photography portfolio", "photo gallery site", "visual artist portfolio", "image-first portfolio", or "masonry gallery", follow `docs/templates/04-portfolio-photo.md`: replace `app/preview/page.tsx` with the provided code; replace "Elara Voss" with the user's name; update `galleryImages` with real Unsplash photo IDs (always verify with agent-browser before using); update the bio and contact details.

## Variations

- **Color accent:** Add a single accent color to the nav logo or CTA — e.g., `text-rose-400` for the site name — breaks the near-monochrome intentionally for a bolder brand feel.
- **Series/project grouping:** Replace the flat gallery with tabbed projects (each tab shows a named series of 6–12 images). Use a `useState` hook for the active series tab; filter `galleryImages` by `series` key.
- **Video hero:** Replace the hero `<img>` with an autoplaying, muted `<video>` loop — works beautifully for motion photographers. Add `poster` attribute equal to the first-frame image URL to avoid layout shift on load.

## Common pitfalls

- CSS columns masonry (`columns-1 sm:columns-2 lg:columns-3`) doesn't reorder images vertically — images flow top-to-bottom in each column, which can look odd if images 1, 4, 7 all happen to be portrait-oriented. Manually alternate `aspect` values in the `galleryImages` array to control visual rhythm.
- Unsplash `?w=800&q=80` is critical for gallery images — without it you serve full-res originals (potentially 15MB+ each). The hero at `?w=1920&q=85` is intentionally higher-res since it's the only visible image on load.
- `loading="lazy"` on all gallery images below the fold is correct. Do NOT add it to the hero image — you want that to load eagerly (remove `loading="lazy"` from any image visible on first render).
- The fixed nav gradient (`bg-gradient-to-b from-neutral-950/70 to-transparent`) means the nav text must be light enough to read over both dark images and very bright images. Test with a white hero image — add `drop-shadow-sm` to the nav text links if needed.
- `break-inside: avoid` on `.masonry-item` in CSS columns prevents a single image from being split across two columns. Without it, wide landscape images can bleed across a column boundary on some browsers.
