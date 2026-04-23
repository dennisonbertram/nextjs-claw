# Wave 4 Picker Fix — E2E Verification

**Date**: 2026-04-23  
**Branch**: main  
**Commits**: `be3aac2` (refactor), `4ea2d51` (docs)

## Problem fixed

Turbopack in Next.js 16 does not inject `_debugSource` onto Fiber nodes. The original picker silently returned `null` on every click, producing empty chips and no file:line context for the agent.

## Fix approach

Drop `_debugSource` entirely. Capture DOM context that is always available: `innerText` (text), `className` (Tailwind classes), DOM path (up to 4 ancestors), and best-effort component name from Fiber `.return` walk. Agent greps for text content to find the source location.

## `getElementRef` output — live results

### h1 element (`"I am an empty canvas."`)

```json
{
  "hasFiber": true,
  "fiberKey": "__reactFiber$8c6koo6...",
  "tagName": "h1",
  "text": "I am an empty canvas.",
  "rawClasses": ["text-5xl", "font-bold", "leading-tight", "tracking-tight", "sm:text-6xl"],
  "domPath": "div.mx-auto > section.text-center > h1.text-5xl"
}
```

- `text`: non-empty ✓
- `classes`: 5 Tailwind classes, all intact, no hash pollution ✓
- `domPath`: 3-level path ending at `h1.text-5xl` ✓

### anchor element (`"Get started"`)

```json
{
  "tagName": "a",
  "text": "Get started",
  "classes": ["rounded-md", "bg-indigo-600", "px-4", "py-2", "text-sm", "font-medium", "text-white", "shadow", "hover:bg-indigo-500"],
  "domPath": "div.mx-auto > section.text-center > div.mt-8 > a.rounded-md",
  "href": "http://localhost:64143/preview#"
}
```

- `text`: non-empty ✓
- `classes`: 9 Tailwind classes ✓
- `domPath`: 4-level path ✓
- `href`: captured ✓

## Chip rendering

After clicking Pick and then the h1, chip renders as:

```
<h1> "I am an empty canvas."   ✕
```

- Tag badge with indigo styling: `<h1>` ✓
- Text italic, max 32 chars ✓
- No stale `LayoutRouterContext` in component chain (filtered by FRAMEWORK_INTERNALS + pattern filter) ✓
- Remove button works ✓
- Chip clears after Send ✓

## Prompt format sent to agent

```
The user clicked these elements in the preview. They're pointing to specific
spots in the source. Grep the codebase for the text or class strings to locate
them precisely — the source files are under `app/preview/`.

1. <h1> "I am an empty canvas."
   classes: text-5xl font-bold leading-tight tracking-tight sm:text-6xl
   dom path: div.mx-auto > section.text-center > h1.text-5xl

User request: make the heading red
```

## Agent behavior — "make the heading red"

| Turn | Tool | Target | Result |
|------|------|--------|--------|
| 1 | Grep | `I am an empty canvas` | Found in `app/preview/page.tsx:10` ✓ |
| 2 | Read | `app/preview/page.tsx` | Read file ✓ |
| 3 | Edit | `app/preview/page.tsx` | Added `text-red-500` to h1 className ✓ |

**Total turns: 3** (within the ≤3 turn target)

Agent message: "Added `text-red-500` to the heading — it should now appear red in the preview."

## Visual result

Screenshot saved at `docs/testing/wave4-fix-screenshot.png`.

The heading "I am an empty canvas." renders in red (`text-red-500`) in the preview iframe. Chat panel remains dark. Composer is empty (references cleared post-send).

## Build verification

`bun run build` passes clean — no TypeScript errors, all 5 routes generated.

## Health endpoint

`GET /api/agent/health` response (no `projectRoot`):
```json
{"ok": true, "claudeVersion": "2.1.118 (Claude Code)"}
```

## Spec deviations

1. **`componentChain` shows empty for the h1** — the `Home` server component wrapped in `react.lazy` doesn't surface a clean component name through the Fiber walk in Next.js 16. The chip renders without a component label, which is acceptable per spec ("If nothing found, omit field"). Filtering was extended to also skip names ending in `Context`, `Provider`, `Consumer`, `Router`, `Boundary`, `Handler`.

2. **`classes` field keeps `sm:text-6xl`** — responsive variants are preserved, which is correct. They're grep-able and help the agent understand the element.

## Conclusion

All three mandatory verifications pass:
- `getElementRef(h1)` → non-empty `text`, `classes`, `domPath` ✓
- Chip renders correctly ✓  
- Agent uses Grep first, lands on `app/preview/page.tsx`, edits in ≤3 turns ✓
