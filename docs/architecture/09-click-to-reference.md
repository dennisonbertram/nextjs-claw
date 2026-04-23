# 09 — Click-to-Reference Picker (Wave 4, Part 2 — grep-based approach)

Builds on doc 08 (iframe isolation). The iframe at `/preview` includes a client-side picker. Users click an element in the preview → chip appears in chat composer → prompt is sent with structured DOM context → agent greps the codebase to find the exact location and edits it.

## Why NOT `_debugSource`

Turbopack in Next.js 16 does **not** inject `_debugSource` onto React Fiber nodes in dev mode. The original `_debugSource`-based implementation silently returned `null` for every click — producing empty chips and useless prompts. The fix: capture rich DOM context (text content, Tailwind classes, DOM path, component name from Fiber walk) and let the agent grep the codebase. Text content and class strings are uniquely grep-able and 100% reliable.

## UX flow

1. User clicks **Pick element** button in chat panel header (or presses `P`).
2. Cursor becomes crosshair. Hover outlines elements in preview iframe with a pulsing indigo border.
3. User clicks. A chip drops into the composer: `<h1> "I am an empty canvas." · Home  ✕`.
4. Pick mode stays active. User can click more elements → more chips. Escape exits pick mode.
5. User types "make these bigger" and hits Send.
6. Agent receives a prompt with a prepended DOM context block. It greps for text content, finds the exact line, edits.
7. After sending, references are cleared.

## Architecture — how the picker reaches the iframe

The iframe is same-origin. Its DOM is fully inspectable by the parent, and it can post messages freely. A small client component (`<PickBridge/>`) is rendered inside the iframe's layout; the parent sends commands via postMessage and receives picks.

Messages (parent ⇄ iframe):

| Direction | Type | Payload |
|-----------|------|---------|
| parent → iframe | `{ kind: 'claw/pick-mode', active: boolean }` | toggle pick overlay |
| iframe → parent | `{ kind: 'claw/pick', ref: ElementRef }` | user picked an element |
| iframe → parent | `{ kind: 'claw/ready' }` | bridge mounted; parent responds with current state |

Origin-check in both directions (`e.origin === window.location.origin`). Ignore other messages.

Note: the `claw/init` message (previously carrying `projectRoot`) has been removed. `projectRoot` is no longer needed client-side.

## Files

### Changed

- `template/lib/react-source.ts` — DOM context capture utilities (no `_debugSource`)
- `template/components/PickBridge.tsx` — removed `projectRoot` state + `claw/init` handler
- `template/components/AppShell.tsx` — removed `projectRoot` state, `claw/init` send
- `template/components/ReferenceChip.tsx` — updated rendering for new `ElementRef` fields
- `template/app/api/agent/route.ts` — updated `parseReferences` + `buildPromptWithReferences`
- `template/app/api/agent/health/route.ts` — removed `projectRoot` from response
- `template/lib/agent-engine.ts` — updated system prompt with grep-based element section

### Unchanged

- `template/lib/agent-events.ts` — no new event types needed
- `template/lib/use-agent-stream.ts` — signature unchanged
- `template/components/Composer.tsx` — unchanged (imports still work)

## Types

`template/lib/react-source.ts`:

```ts
export interface ElementRef {
  id: string;                  // crypto.randomUUID
  tagName: string;             // lowercase, e.g. "h1"
  text: string;                // trimmed innerText, first ~100 chars, collapsed whitespace
  classes: string[];           // split className; dedupe; drop Next/module hashes
  domPath: string;             // up to 4 levels of "tag.firstClass", joined " > "
  ariaLabel?: string;          // getAttribute('aria-label') if present
  role?: string;               // getAttribute('role') if present
  href?: string;               // for <a> / <link> / <area>
  componentChain?: string;     // best-effort Fiber walk: "Home → Layout"
}
```

## DOM capture strategy — `template/lib/react-source.ts`

Everything here runs client-side, inside the iframe. No Fiber `_debugSource` dependency.

**`text`**: `innerText ?? textContent`, trimmed, whitespace collapsed, sliced to 100 chars (appends `…` if longer).

**`classes`**: `el.className.split(/\s+/)`, stripped of CSS module hash suffixes (e.g. `page_xyz123__abc` → `page`), deduped. Tailwind classes like `text-5xl`, `font-bold` survive untouched.

**`domPath`**: Walk up ≤4 levels. For each node: `tag` + `.` + first meaningful class (skipping hash-looking, very short, or all-caps tokens). Stop at `body`/`html`. Result: `div.container > section > h1.text-5xl`.

**`componentChain`**: Walk Fiber `.return` chain up to 15 levels. For each fiber, `t = fiber.elementType ?? fiber.type`. If function/class with a capitalized name, collect it. Handle `react.lazy` by checking `$$typeof.toString().includes('react.lazy')` and unwrapping `t._payload?._result`. Stop at known Next.js internal names. If nothing found, field is omitted.

## Prompt format sent to the agent

```
The user clicked these elements in the preview. They're pointing to specific
spots in the source. Grep the codebase for the text or class strings to locate
them precisely — the source files are under `app/preview/`.

1. <h1> "I am an empty canvas."
   classes: text-5xl font-bold leading-tight tracking-tight sm:text-6xl
   dom path: div > section > h1.text-5xl
   component: Home

2. <button> "Get started"
   classes: rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white
   dom path: section > div > a.rounded-md

User request: make these bigger
```

Only `classes`, `dom path`, `component` lines are emitted when non-empty. If refs is empty/undefined, raw `userPrompt` is passed through unchanged.

## ReferenceChip rendering

```
[<h1>]  "I am an empty canvas."    · Home  ✕
```

- Tag: small rounded pill with indigo styling.
- Text: italic, max 32 chars, ellipsis if longer.
- componentChain first segment (if present): faint, after a middot.
- If `text` is empty, falls back to first class or domPath tail so chips are never blank.
- `✕` remove button.

## Acceptance tests

1. `bun run build` passes — TypeScript and Next.js build clean.
2. Visit `/`. Chat panel visible; iframe shows the canvas page.
3. Click **Pick element** → cursor is crosshair in iframe; hover outlines elements.
4. Click the `<h1>`. Chip appears: `<h1> "I am an empty canvas." · Home  ✕`.
5. `getElementRef(h1)` returns non-empty `text`, `classes`, `domPath`.
6. Send "make the heading red" with the chip attached.
7. Agent greps for the text content, finds `app/preview/page.tsx`, edits the class. ≤3 turns.
8. After send, heading is red; chip is cleared from composer.
9. Escape exits pick mode without picking.

## Gotchas

- **Production builds**: Fiber is present after hydration, but `_debugSource` was never used here anyway. DOM text + classes are always available regardless of build mode.
- **HMR invalidates text/classes after agent edits**: references are meant to be used immediately, then cleared. That's why `setReferences([])` fires after `send()`.
- **Picker crosshair covers entire iframe document** — correct behavior.
- **Overlay is never picked**: handled by `t === overlayRef.current` check.
- **CSS specificity**: inline styles on the overlay can't be overridden by user app styles.

## Commit

`refactor(picker): drop _debugSource, capture DOM context for grep-based resolution`
