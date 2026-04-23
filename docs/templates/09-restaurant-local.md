# 09 — Restaurant / Local Business

## What this gives you

A warm, food-photography-forward landing page for a restaurant, café, bakery, or similar local business. Full-bleed hero image, a brief mood statement, a menu section organized by category, an hours/location card, and a contact/reservation CTA. The design uses deep warm tones — `stone-950` background with `amber` and `orange` accents — to evoke warmth and appetite. Readable at a glance, works beautifully on mobile where most restaurant searches happen.

## Visual reference

Inspiration URLs (confirmed live 2026-04-23):
- https://ghost.org — minimal nav, large imagery, direct CTAs — the structural discipline is transferable
- https://framer.com/marketplace/templates — restaurant/hospitality template patterns in the marketplace
- https://vercel.com/templates — card-based layouts adapted to menu grid

Verified Unsplash photos:
- `photo-1504674900247-0877df9cc836` — food/meal photography (1280×853)

## Design tokens

- **Palette:** `stone-950` bg, `stone-100` fg, `stone-400` muted, `amber-400` accent, `amber-500` hover, `stone-900` card bg, `stone-800` border — warm stone-and-amber, not cold neutral
- **Typography:** `font-serif` (Georgia) for the restaurant name and menu section headers — hospitality register; `text-sm text-stone-400` for hours/meta; `text-3xl font-bold` menu category headers
- **Key ideas:**
  - Everything is in service of the food: hero image is near-full-screen, menu uses generous padding, no cluttered widgets
  - Hours/location is in a visible, prominent card — this is what mobile users came for
  - Menu organized by category with a sticky category pill nav that jumps-to-section on tap
  - Reservation/order CTA is prominent and repeated (hero + bottom of page)

## Sections (in order)

1. **Minimal nav** — restaurant name center, phone number and "Reserve" CTA flanking it
2. **Hero** — full-viewport food photograph, name overlay, tagline, two CTAs (Reserve, View Menu)
3. **About strip** — one paragraph, warm tone, James Beard Award / accolade mentions optional
4. **Menu** — pill category nav, sections (Starters, Mains, Desserts, Drinks) each with items
5. **Location & hours card** — address, map link, hours grid, phone
6. **Footer** — logo, social links, Google Maps link, copyright

## Files the agent creates

- `app/preview/page.tsx` — full page
- `app/preview/layout.tsx` — title + metadata
- `app/preview/globals.css` — warm palette base styles

## Code

### `app/preview/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hearth & Grain — Modern American Kitchen',
  description: 'A neighborhood restaurant in San Francisco focused on seasonal, locally sourced ingredients.',
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-950 text-stone-100 antialiased">{children}</body>
    </html>
  );
}
```

### `app/preview/globals.css`

```css
@import "tailwindcss";

@theme {
  --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-serif: Georgia, 'Times New Roman', ui-serif, serif;
  --font-mono: ui-monospace, 'Cascadia Code', monospace;
}
```

### `app/preview/page.tsx`

```tsx
// Photo credit: Lukas @goumbik on Unsplash (photo-1504674900247-0877df9cc836)

const menuSections = [
  {
    id: 'starters',
    label: 'Starters',
    items: [
      { name: 'Charred broccolini', desc: 'Lemon, garlic, chili flake, toasted almonds', price: '$14' },
      { name: 'Roasted bone marrow', desc: 'Sourdough toast, herb gremolata, sea salt', price: '$18' },
      { name: 'Burrata & heirloom tomato', desc: 'Basil oil, fleur de sel, grilled levain', price: '$16' },
      { name: 'Crispy pork belly', desc: 'Apple butter, pickled mustard seed, watercress', price: '$19' },
    ],
  },
  {
    id: 'mains',
    label: 'Mains',
    items: [
      { name: 'Dry-aged duck breast', desc: 'Sour cherry jus, celery root purée, haricots verts', price: '$42' },
      { name: 'Grilled halibut', desc: 'Corn succotash, smoked paprika butter, micro greens', price: '$38' },
      { name: 'Short rib risotto', desc: '24-hour braised short rib, parmesan cream, truffle oil', price: '$36' },
      { name: 'Mushroom & leek tart', desc: 'Gruyère, caramelized onion, arugula, lemon vinaigrette', price: '$28' },
    ],
  },
  {
    id: 'desserts',
    label: 'Desserts',
    items: [
      { name: 'Olive oil cake', desc: 'Blood orange curd, candied zest, crème fraîche', price: '$13' },
      { name: 'Dark chocolate tart', desc: 'Fleur de sel, caramel, vanilla ice cream', price: '$14' },
      { name: 'Seasonal sorbet', desc: 'Ask your server for today\'s selection', price: '$10' },
    ],
  },
  {
    id: 'drinks',
    label: 'Drinks',
    items: [
      { name: 'Natural wines', desc: 'Curated list — ask your server', price: 'from $14' },
      { name: 'Signature cocktails', desc: 'Seasonal, rotating', price: '$16' },
      { name: 'Craft beer', desc: 'Four local taps, rotating selection', price: '$9' },
      { name: 'Non-alcoholic', desc: 'Shrubs, sodas, pressed juices', price: 'from $7' },
    ],
  },
];

const hours = [
  { days: 'Monday – Thursday', time: '5:00 pm – 10:00 pm' },
  { days: 'Friday – Saturday', time: '5:00 pm – 11:00 pm' },
  { days: 'Sunday', time: '11:00 am – 3:00 pm (brunch)' },
];

export default function RestaurantPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Minimal nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-stone-950/85 border-b border-stone-800/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <a
            href="tel:+14158675309"
            className="text-xs font-mono text-stone-500 hover:text-stone-300 transition-colors hidden sm:block"
          >
            (415) 867-5309
          </a>
          <a
            href="#"
            className="font-bold text-stone-100 text-xl tracking-tight"
            style={{ fontFamily: 'Georgia, ui-serif, serif' }}
          >
            Hearth & Grain
          </a>
          <a
            href="#reserve"
            className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs px-4 py-2 rounded-xl transition-colors"
          >
            Reserve a table
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-screen overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=85"
          alt="Beautifully plated seasonal dish"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-stone-950/10" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-12 pb-16">
          <p className="text-xs font-mono text-amber-400 uppercase tracking-[0.2em] mb-3">
            Modern American Kitchen · San Francisco
          </p>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-stone-50 mb-4 leading-[1.05]"
            style={{ fontFamily: 'Georgia, ui-serif, serif' }}
          >
            Hearth & Grain
          </h1>
          <p className="text-lg text-stone-300 max-w-md mb-8 leading-relaxed">
            Seasonal ingredients, honest cooking, a room worth staying in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#reserve"
              className="inline-flex items-center justify-center bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Reserve a table
            </a>
            <a
              href="#menu"
              className="inline-flex items-center justify-center bg-stone-950/60 hover:bg-stone-900/80 border border-stone-700 text-stone-200 font-medium px-6 py-3 rounded-xl text-sm transition-colors"
            >
              View menu
            </a>
          </div>
        </div>
      </section>

      {/* About strip */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p
          className="text-xl sm:text-2xl font-light text-stone-300 leading-relaxed"
          style={{ fontFamily: 'Georgia, ui-serif, serif' }}
        >
          "We cook the way we eat at home — with attention, without pretension,
          using whatever the season gives us."
        </p>
        <div className="mt-6 text-sm text-stone-600">
          Neighborhood restaurant · Opened 2019 · Sourced within 100 miles
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Category pills nav */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 mb-10 sticky top-16 z-40 bg-stone-950/95 py-3 -mx-6 px-6">
            {menuSections.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-xs font-mono bg-stone-900 border border-stone-800 hover:border-amber-500/50 text-stone-400 hover:text-amber-400 px-4 py-2 rounded-xl whitespace-nowrap transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          {menuSections.map(({ id, label, items }) => (
            <div key={id} id={id} className="mb-14">
              <h2
                className="text-2xl font-bold tracking-tight text-stone-100 mb-6 pb-3 border-b border-stone-800"
                style={{ fontFamily: 'Georgia, ui-serif, serif' }}
              >
                {label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.map(({ name, desc, price }) => (
                  <div key={name} className="flex justify-between gap-4 py-3 border-b border-stone-800/40 last:border-0">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-stone-100 mb-0.5">{name}</div>
                      <div className="text-xs text-stone-500 leading-relaxed">{desc}</div>
                    </div>
                    <div className="text-sm font-mono text-amber-400 flex-shrink-0 pt-0.5">{price}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-stone-600 text-center font-mono">
            Menu changes seasonally. Dietary accommodations available — please ask your server.
          </p>
        </div>
      </section>

      {/* Location & Hours */}
      <section id="reserve" className="border-t border-stone-800/60 py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Location */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <h3
              className="text-lg font-bold text-stone-100 mb-4 tracking-tight"
              style={{ fontFamily: 'Georgia, ui-serif, serif' }}
            >
              Find us
            </h3>
            <address className="not-italic space-y-2 text-stone-400 text-sm">
              <p className="text-stone-200 font-medium">Hearth & Grain</p>
              <p>742 Evergreen Terrace</p>
              <p>San Francisco, CA 94110</p>
            </address>
            <div className="mt-4 space-y-2">
              <a
                href="tel:+14158675309"
                className="flex items-center gap-2 text-sm text-stone-400 hover:text-amber-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 3.5A1.5 1.5 0 013.5 2h1.5a.5.5 0 01.5.4l.8 3.2a.5.5 0 01-.1.5l-1.2 1.2a8 8 0 003.7 3.7l1.2-1.2a.5.5 0 01.5-.1l3.2.8a.5.5 0 01.4.5V12.5A1.5 1.5 0 0112.5 14C6.7 14 2 9.3 2 3.5z" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
                (415) 867-5309
              </a>
              <a
                href="https://maps.google.com"
                className="flex items-center gap-2 text-sm text-stone-400 hover:text-amber-400 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M8 2a5 5 0 00-5 5c0 3.5 5 8 5 8s5-4.5 5-8a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
                Get directions
              </a>
            </div>
          </div>

          {/* Hours */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <h3
              className="text-lg font-bold text-stone-100 mb-4 tracking-tight"
              style={{ fontFamily: 'Georgia, ui-serif, serif' }}
            >
              Hours
            </h3>
            <div className="space-y-3">
              {hours.map(({ days, time }) => (
                <div key={days} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-stone-800/60 last:border-0">
                  <span className="text-sm text-stone-400">{days}</span>
                  <span className="text-sm font-mono text-amber-400">{time}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <a
                href="https://resy.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                Reserve via Resy →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800/60 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <a
            href="#"
            className="font-bold text-stone-600 text-sm"
            style={{ fontFamily: 'Georgia, ui-serif, serif' }}
          >
            Hearth & Grain
          </a>
          <div className="flex items-center gap-5 text-xs text-stone-700">
            <a href="https://instagram.com" className="hover:text-stone-400 transition-colors">Instagram</a>
            <a href="https://maps.google.com" className="hover:text-stone-400 transition-colors" target="_blank" rel="noopener noreferrer">Google Maps</a>
            <a href="https://yelp.com" className="hover:text-stone-400 transition-colors" target="_blank" rel="noopener noreferrer">Yelp</a>
          </div>
          <p className="text-xs text-stone-800">© 2026 Hearth & Grain</p>
        </div>
      </footer>
    </div>
  );
}
```

## Integration hook — how the embedded agent invokes this

When the user asks for "a restaurant website", "café site", "local business page", "food business landing", or "menu page", follow `docs/templates/09-restaurant-local.md`: replace `app/preview/page.tsx` with the provided code; replace "Hearth & Grain" with the business name; update `menuSections` with the actual menu (or reasonable placeholders); update `hours` and address with real or placeholder information; swap the Resy link for the actual reservation platform.

## Variations

- **Takeout / fast-casual:** Remove the hero food photography mood and the quote strip; replace with a brighter palette (`amber-50` bg), a simpler menu list (no descriptions, just item+price), and prominent delivery app links (DoorDash, UberEats, Grubhub buttons).
- **Bakery / café variant:** Replace `menuSections` with "Pastries", "Breads", "Coffee", "Seasonal"; shorten the menu items (no long wine descriptions); add an "Order for pickup" CTA using a Square/Toast link.
- **Light mode:** Use `stone-50` bg, `stone-900` fg, `amber-600` accent — the warm amber reads beautifully on light cream backgrounds and feels even more organic and food-forward.

## Common pitfalls

- `sticky` category nav inside the menu section needs `z-40` and `bg-stone-950/95` to appear above non-sticky content — without the background, the sticky nav becomes transparent and unreadable over menu items below it.
- The hero image at `?w=1920&q=85` is intentionally larger than the standard 1280px — full-viewport heroes need higher resolution on retina displays. Don't reduce this below 1440px.
- `not-italic` on the `<address>` tag overrides the browser default italic style — always include it when using `<address>` for physical location, or the text will appear italicized unexpectedly.
- Menu prices use `font-mono` — if the user's currency is EUR or GBP, test that `€` and `£` render correctly in the monospace font. Some mono fonts have missing currency glyphs; fall back to `font-sans` if needed.
- The sticky menu category nav uses negative horizontal margin (`-mx-6 px-6`) to stretch the background full-width while the content stays within the container — if you change the page horizontal padding, update both values to match.
