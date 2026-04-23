---
description: Visual polish pass on the running app — typography, spacing, color, depth, motion. Captures before/after screenshots. Small, reversible changes only.
---

You are doing a focused **visual-polish pass** on a running web app. Not a redesign. Not a refactor. Your job is to make what's already there feel more intentional, more premium, more current-2026 in aesthetic — without touching functionality.

**Scope:** $ARGUMENTS

If `$ARGUMENTS` is empty, default scope is "the chat shell UI at `/` (components under `template/components/`, the empty-canvas preview at `app/preview/page.tsx`, and shared styling in `app/shell.css` / `app/preview/globals.css`)".

## Ground rules

1. **Visual-only.** Never touch `lib/agent-*.ts`, `lib/use-agent-stream.ts`, `lib/react-source.ts`, or anything under `app/api/`. If a visual change requires engine changes, skip it.
2. **No new packages.** Tailwind v4 utilities, inline SVG, CSS tricks (gradients, `backdrop-blur`, `mask-image`, `conic-gradient`) only.
3. **Every change must be reversible with one `git revert`.** No refactors bundled in.
4. **Copy changes:** OK for marketing-ish text ("Start with a template", example prompts, button labels). Off-limits: error messages, health hints, system-prompt text.
5. **Preserve semantics + accessibility.** Focus states, ARIA, contrast ratios — don't regress any of it.

## Process

### 1. Baseline capture

```sh
cd template
# Start dev if not running
lsof -i :3000 >/dev/null 2>&1 || bun dev &
# Wait for health
PORT=$(curl -fs http://localhost:3000/api/agent/health >/dev/null 2>&1 && echo 3000 || echo "")
[ -z "$PORT" ] && echo "Start dev server first: cd template && bun dev" && exit 1
```

Screenshot the running app:
```sh
agent-browser open "http://localhost:$PORT/"
sleep 2
agent-browser screenshot docs/testing/design-before-desktop.png
agent-browser resize 420 800 && agent-browser screenshot docs/testing/design-before-mobile.png
agent-browser resize 1280 800
```

### 2. Audit

Walk each region of the UI and jot observations into `docs/testing/design-audit.md`. For each region (chat header, template picker, composer, hero preview, iframe frame), note:

- **Typography** — are headings tracking-tight appropriately? Line-heights breathing (1.4–1.6 body, ~1.1 display)? Font-size scale consistent (ratio ~1.25)?
- **Spacing rhythm** — sticking to 4/8/12/16/24/32/48/64px? Any ad-hoc `mt-[11px]` numbers?
- **Color** — dark-mode contrast WCAG AA for body text? Accent used sparingly (<5% of pixels)? Border vs. body color distinct?
- **Depth** — flat surfaces that deserve `shadow-lg`, `backdrop-blur`, or a subtle gradient? Any shadow looking cheap (too dark, too sharp)?
- **Motion** — transition on hover/focus? Any abrupt state toggle? Panel slide feels smooth?
- **Alignment** — optical centers right? Icons baseline-aligned with text? 1-2px nudges needed?
- **Emptiness** — any region that feels blank vs. quiet (intentional vs. unfinished)?

### 3. Rank

Pick the top **5** highest-impact, lowest-risk changes. High impact = visibly different in a thumbnail. Low risk = one file, one concern, reversible. Add ranked list to `design-audit.md`.

Examples of the kind of change to prefer:
- Tighter `tracking` + heavier `font-weight` on hero H1
- `bg-gradient-to-b` under a logo band for a subtle horizon
- `backdrop-blur-md` + `bg-white/5` on the chat header
- Softer button `shadow-xs` with a `ring-1 ring-white/10` highlight
- Replace emoji with inline SVG when emoji looks inconsistent cross-OS
- Tighten empty-state margin / add a subtle divider
- Introduce a single custom color token in `@theme` for the accent, use throughout

Examples of what to AVOID in a polish pass:
- Changing the component tree
- Adding animations that distract during typing
- Swapping out the whole color palette
- Refactoring how a component takes props

### 4. Apply in waves

For each of the 5 changes:
1. Edit the file (one file at a time).
2. Wait 2–3s for Turbopack HMR.
3. Take a fresh screenshot → `docs/testing/design-step-NN.png`.
4. If the change made the page worse at thumbnail size — **revert it immediately**. Tasteful revert is always the right move.

### 5. Side-by-side

Save a before/after composite to `docs/testing/design-before-after.png`:
```sh
# If ImageMagick is available:
convert docs/testing/design-before-desktop.png docs/testing/design-after-desktop.png +append docs/testing/design-before-after.png
# Otherwise: leave both PNGs side by side; that's fine.
```

Where `design-after-desktop.png` is a final full-viewport screenshot after all applied changes.

### 6. Commit

One commit, one commit message: `polish(ui): <one-line summary of top 5>`.

Do NOT push — leave that to the user, in case they want to revert or iterate first.

## Report

Close with:
- **Applied:** bullet list of the 5 changes that shipped (file + one-line description)
- **Explored but rejected:** 2–3 ideas you tried and reverted (and why)
- **Left alone on purpose:** 1–2 things you noticed but chose not to touch (with rationale)

Total response under 300 words outside the bullets. Let the screenshots do the talking.
