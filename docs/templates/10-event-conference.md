# 10 — Event / Conference

## What this gives you

A single-page conference or event landing. Date and location are the biggest text on the page after the event name — that's what people came for. Below: a speaker grid with headshots, a schedule timeline, a sponsor tier display, and a prominent ticket CTA that persists as a floating button on mobile. The design is energetic and bold — a strong gradient hero, large numbers, tight typographic hierarchy. Suitable for tech conferences, workshops, community events, and hackathons.

## Visual reference

![screenshot](./screenshots/inspiration/framer-templates-01.png)

Inspiration URLs (confirmed live 2026-04-23):
- https://framer.com/marketplace/templates — event/conference template patterns in the marketplace
- https://vercel.com/templates — single-page event layouts, speaker card grids
- https://linear.app — bold date/location presentation, high information density done cleanly

Verified Unsplash photo:
- `photo-1540575467063-178a50c2df87` — conference/event photography (1280×853)

## Design tokens

- **Palette:** `neutral-950` bg, `neutral-100` fg, `violet-600` primary accent, `fuchsia-500` secondary accent gradient, `neutral-900` card bg
- **Typography:** `text-7xl sm:text-9xl font-black tracking-tighter` event date; `text-5xl font-black` event name; `text-xs font-mono uppercase tracking-widest` section labels
- **Key ideas:**
  - Date gets the biggest type on the page — `text-9xl` — treated as a design element
  - Speaker cards use `aspect-square` avatar with gradient fallback; name + title + company below
  - Schedule is a vertical timeline with time left, content right; alternating subtle background on rows
  - Ticket CTA is both in-page and floating fixed bottom on mobile — can't miss it
  - Gradient: `from-violet-900 via-neutral-950 to-neutral-950` for the hero — bold but not neon

## Sections (in order)

1. **Sticky nav** — event name left, "Get tickets" right
2. **Hero** — event name, date huge, location, ticket CTA
3. **About** — 2–3 sentence event mission, key stats (attendees, speakers, days)
4. **Speakers** — 3-col grid of speaker cards with avatar, name, title
5. **Schedule** — vertical timeline with time slots, talk titles, speaker names
6. **Sponsors** — three tier rows (Platinum, Gold, Community)
7. **Tickets** — prominent CTA card, "Register now" button
8. **Footer** — event social links, code of conduct, copyright

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
  title: 'Nexus Conf 2026 — San Francisco',
  description: 'Two days of talks, workshops, and hallway conversations on the future of developer infrastructure. June 14–15, 2026.',
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
// Photo credit: Kane Reinholdtsen on Unsplash (photo-1540575467063-178a50c2df87)

const speakers = [
  { name: 'Yuki Tanaka',   title: 'Staff Engineer',      company: 'Vercel',       initials: 'YT', gradient: 'from-violet-600 to-indigo-600' },
  { name: 'Priya Mehta',   title: 'VP Engineering',      company: 'Axiom',        initials: 'PM', gradient: 'from-fuchsia-600 to-violet-600' },
  { name: 'Carlos Reyes',  title: 'Founding Engineer',   company: 'Harbor Labs',  initials: 'CR', gradient: 'from-indigo-600 to-blue-600' },
  { name: 'Noa Ashworth',  title: 'Staff Infra Engineer', company: 'Lineage',     initials: 'NA', gradient: 'from-violet-600 to-fuchsia-600' },
  { name: 'Soren Kade',    title: 'Principal Designer',  company: 'Clave Studio', initials: 'SK', gradient: 'from-blue-600 to-indigo-600' },
  { name: 'Maya Chen',     title: 'Product Engineer',    company: 'Vault AI',     initials: 'MC', gradient: 'from-fuchsia-600 to-pink-600' },
];

const schedule = [
  { time: '9:00 AM', track: 'Keynote', title: 'The next decade of developer infrastructure', speaker: 'Priya Mehta' },
  { time: '10:15 AM', track: 'Talk', title: 'Edge functions at scale: lessons from 10 billion requests', speaker: 'Yuki Tanaka' },
  { time: '11:00 AM', track: 'Workshop', title: 'Building observable systems with OpenTelemetry', speaker: 'Carlos Reyes' },
  { time: '12:30 PM', track: 'Lunch', title: 'Lunch & networking break', speaker: '' },
  { time: '2:00 PM', track: 'Talk', title: 'Design tokens are not a design system', speaker: 'Soren Kade' },
  { time: '3:00 PM', track: 'Panel', title: 'The future of frontend: RSC, signals, and beyond', speaker: 'Maya Chen + 3 others' },
  { time: '4:00 PM', track: 'Talk', title: 'Zero-downtime database migrations in production', speaker: 'Noa Ashworth' },
  { time: '5:30 PM', track: 'Social', title: 'Evening reception & demo hall', speaker: '' },
];

const sponsors = {
  Platinum: ['Axiom', 'Harbor Labs', 'Lineage'],
  Gold:     ['Vault AI', 'Crestline', 'Meridian', 'Foundry'],
  Community:['Clave Studio', 'TypeBound', 'OpenShift', 'Render', 'Railway'],
};

const trackColor: Record<string, string> = {
  'Keynote':  'bg-violet-500/20 text-violet-300',
  'Talk':     'bg-indigo-500/15 text-indigo-300',
  'Workshop': 'bg-blue-500/15 text-blue-300',
  'Panel':    'bg-fuchsia-500/15 text-fuchsia-300',
  'Lunch':    'bg-neutral-800 text-neutral-500',
  'Social':   'bg-amber-500/15 text-amber-300',
};

export default function EventPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Sticky nav */}
      <header className="sticky top-0 z-50 border-b border-neutral-800/60 backdrop-blur-md bg-neutral-950/85">
        <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="#" className="font-black tracking-tight text-neutral-100 text-sm sm:text-base">
            Nexus Conf <span className="text-violet-400">2026</span>
          </a>
          <div className="flex items-center gap-4">
            <ul className="hidden sm:flex items-center gap-5 text-sm text-neutral-500">
              <li><a href="#speakers" className="hover:text-neutral-200 transition-colors">Speakers</a></li>
              <li><a href="#schedule" className="hover:text-neutral-200 transition-colors">Schedule</a></li>
              <li><a href="#sponsors" className="hover:text-neutral-200 transition-colors">Sponsors</a></li>
            </ul>
            <a
              href="#tickets"
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get tickets
            </a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Hero image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80"
            alt="Conference hall filled with attendees"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-violet-950/80 via-neutral-950/70 to-neutral-950" aria-hidden="true" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24">
          {/* Event name */}
          <div className="mb-4">
            <span className="text-xs font-mono text-violet-400 uppercase tracking-[0.2em]">
              Developer Infrastructure Summit
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-neutral-50 mb-6 leading-[1.0]">
            Nexus Conf<br />
            <span className="text-violet-400">2026</span>
          </h1>

          {/* Date — massive */}
          <div className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter text-neutral-50/20 leading-none mb-2 select-none" aria-hidden="true">
            JUN 14
          </div>
          <div className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter text-neutral-50/20 leading-none mb-8 select-none" aria-hidden="true">
            & 15
          </div>

          {/* Readable date + location */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div>
              <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-1">Date</p>
              <p className="text-neutral-200 font-semibold">June 14–15, 2026</p>
            </div>
            <div>
              <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-1">Location</p>
              <p className="text-neutral-200 font-semibold">Moscone Center West, San Francisco</p>
            </div>
            <div>
              <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-1">Format</p>
              <p className="text-neutral-200 font-semibold">In-person + livestream</p>
            </div>
          </div>

          <a
            href="#tickets"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-violet-900/50"
          >
            Register now
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </section>

      {/* About stats */}
      <section className="border-y border-neutral-800/60 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '1,200+', label: 'Attendees' },
            { value: '40+',    label: 'Speakers' },
            { value: '2',      label: 'Days' },
            { value: '12',     label: 'Workshops' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl font-black tracking-tighter text-violet-400">{value}</div>
              <div className="text-xs text-neutral-500 mt-1 font-mono">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Speakers */}
      <section id="speakers" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-8">Speakers</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {speakers.map(({ name, title, company, initials, gradient }) => (
              <div key={name} className="group text-center">
                <div className={`aspect-square rounded-2xl bg-gradient-to-br ${gradient} mb-3 flex items-center justify-center text-xl font-black text-white/80 overflow-hidden`}>
                  {initials}
                </div>
                <p className="text-sm font-semibold text-neutral-200">{name}</p>
                <p className="text-xs text-neutral-600 mt-0.5">{title}</p>
                <p className="text-xs text-neutral-700">{company}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule */}
      <section id="schedule" className="border-t border-neutral-800/60 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-2">Schedule</p>
          <p className="text-sm text-neutral-600 mb-8 font-mono">Day 1 — June 14, 2026</p>
          <div className="space-y-1">
            {schedule.map(({ time, track, title, speaker }, i) => (
              <div
                key={`${time}-${title}`}
                className={`grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-4 items-start py-3 px-4 rounded-xl ${i % 2 === 0 ? 'bg-neutral-900/30' : ''}`}
              >
                <span className="text-xs font-mono text-neutral-600 pt-0.5">{time}</span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className={`inline-flex self-start text-[10px] font-mono px-2 py-0.5 rounded-full ${trackColor[track] || 'bg-neutral-800 text-neutral-500'}`}>
                    {track}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{title}</p>
                    {speaker && <p className="text-xs text-neutral-600 mt-0.5">{speaker}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-700 font-mono mt-4 text-center">Full schedule including Day 2 coming soon</p>
        </div>
      </section>

      {/* Sponsors */}
      <section id="sponsors" className="border-t border-neutral-800/60 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-10 text-center">Sponsors</p>
          {Object.entries(sponsors).map(([tier, names]) => (
            <div key={tier} className="mb-8">
              <p className="text-xs font-mono text-neutral-700 uppercase tracking-widest text-center mb-4">{tier}</p>
              <div className={`flex flex-wrap items-center justify-center gap-6 ${tier === 'Platinum' ? 'gap-10' : ''}`}>
                {names.map((name) => (
                  <span
                    key={name}
                    className={`font-semibold text-neutral-600 hover:text-neutral-400 transition-colors cursor-default ${
                      tier === 'Platinum' ? 'text-base' : tier === 'Gold' ? 'text-sm' : 'text-xs'
                    }`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tickets */}
      <section id="tickets" className="border-t border-neutral-800/60 py-20 px-6">
        <div className="max-w-xl mx-auto bg-gradient-to-br from-violet-900/40 via-neutral-900 to-neutral-900 border border-violet-500/20 rounded-2xl p-8 text-center">
          <span className="inline-flex items-center gap-1 text-xs font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" aria-hidden="true" />
            Early bird pricing ends May 1
          </span>
          <h2 className="text-3xl font-black tracking-tighter text-neutral-50 mb-2">Register for Nexus Conf</h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            In-person pass includes all talks, workshops, evening reception, and lunch on both days.
            Livestream pass gives full access to all recorded sessions within 48 hours.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            {[
              { type: 'In-person', price: '$499', note: 'Earlybird (ends May 1)' },
              { type: 'Livestream', price: '$149', note: 'All recordings included' },
            ].map(({ type, price, note }) => (
              <div key={type} className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4">
                <div className="text-xs text-neutral-500 mb-1">{type}</div>
                <div className="text-2xl font-black tracking-tight text-neutral-50">{price}</div>
                <div className="text-[10px] font-mono text-neutral-600 mt-0.5">{note}</div>
              </div>
            ))}
          </div>
          <a
            href="https://ti.to"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-violet-900/40"
          >
            Register now → ti.to/nexusconf
          </a>
          <p className="text-xs text-neutral-700 mt-3 font-mono">Student & scholarship tickets available — email hello@nexusconf.dev</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/60 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <a href="#" className="font-black tracking-tight text-neutral-600 text-sm">
            Nexus Conf <span className="text-violet-600">2026</span>
          </a>
          <div className="flex items-center gap-5 text-xs text-neutral-700">
            <a href="https://twitter.com" className="hover:text-neutral-500 transition-colors">Twitter</a>
            <a href="#" className="hover:text-neutral-500 transition-colors">Code of Conduct</a>
            <a href="#" className="hover:text-neutral-500 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-neutral-800">© 2026 Nexus Conference, Inc.</p>
        </div>
      </footer>

      {/* Mobile floating ticket button */}
      <div className="fixed bottom-4 left-4 right-4 z-50 sm:hidden">
        <a
          href="#tickets"
          className="block text-center bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3.5 rounded-2xl text-sm transition-colors shadow-xl shadow-violet-900/60"
        >
          Get tickets — from $149
        </a>
      </div>
    </div>
  );
}
```

## Integration hook — how the embedded agent invokes this

When the user asks for "a conference page", "event landing", "summit website", "hackathon page", or "workshop event site", follow `docs/templates/10-event-conference.md`: replace `app/preview/page.tsx` with the provided code; replace "Nexus Conf" with the event name; update `speakers`, `schedule`, and `sponsors` with actual data; update the date, location, and ticket CTA link; swap `violet-600` accent for the event's brand color.

## Variations

- **Single-day event:** Remove the "Day 2" note from the schedule footer and shorten the schedule array; remove the stats bar "Days" counter. The vertical timeline scales cleanly to 4–8 items.
- **Free / community event:** Remove ticket pricing entirely; replace the "Tickets" section with a simple RSVP form (name + email) and social sharing buttons — keeps all other sections intact.
- **Workshop-only:** Remove the hero conference photo and replace with a dark gradient hero; remove the speaker grid and replace with a "What you'll build" section with 3 outcome bullets. Works for technical workshops, bootcamps, and intensive courses.

## Common pitfalls

- The huge date watermark (`text-9xl font-black text-neutral-50/20`) is purely decorative — it has `aria-hidden="true"` and `select-none` applied. The accessible date information is in the human-readable "Date / Location / Format" row below it. Don't remove that row.
- The mobile floating CTA button uses `sm:hidden` — on tablets and larger it should not appear since the sticky nav already has the "Get tickets" button. Verify the breakpoints are correct for your target device sizes.
- `grid-cols-[80px_1fr]` in the schedule uses an arbitrary Tailwind v4 grid column syntax — if you're targeting Tailwind v3, use `grid-cols-[5rem_1fr]` (rem-based) instead.
- Speaker cards use `aspect-square` gradient blocks instead of photos. If you add real headshots via Unsplash, verify the images are properly cropped/centered by adding `object-cover object-center` to the `<img>` element.
- The sponsor tier system (`Platinum` > `Gold` > `Community`) uses font size as the hierarchy signal — ensure the name display font size difference is noticeable at actual screen size. `text-base` vs `text-sm` vs `text-xs` is subtle; consider `text-lg / text-sm / text-xs` for stronger contrast.
