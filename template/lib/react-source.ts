export interface ElementRef {
  id: string;              // client-generated UUID for list keying
  fileName: string;        // project-relative, e.g. "app/preview/page.tsx"
  lineNumber: number;
  columnNumber: number;
  componentName: string;   // nearest owner component, e.g. "Home" or "Tile"
  tagName: string;         // upper-case, "H1" / "BUTTON"
  textSnippet: string;     // first ~80 chars of innerText, trimmed
  cssPath: string;         // short selector, e.g. "section > h1"
}

// ─── public API ────────────────────────────────────────────────────────────

export function getElementRef(el: Element, projectRoot: string): ElementRef | null {
  const fiber = getFiber(el);
  if (!fiber) return null;

  const debug = findDebugSource(fiber);
  if (!debug) return null;

  return {
    id: crypto.randomUUID(),
    fileName: makeRelative(debug.fileName, projectRoot),
    lineNumber: debug.lineNumber,
    columnNumber: debug.columnNumber ?? 0,
    componentName: findOwnerName(fiber) ?? 'Unknown',
    tagName: el.tagName,
    textSnippet: ((el as HTMLElement).innerText ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
    cssPath: buildCssPath(el),
  };
}

// ─── internals ─────────────────────────────────────────────────────────────

interface MinimalFiber {
  _debugSource?: { fileName: string; lineNumber: number; columnNumber?: number };
  _debugOwner?: MinimalFiber;
  return?: MinimalFiber;
  elementType?: unknown;
  type?: unknown;
}

function getFiber(el: Element): MinimalFiber | null {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
  if (!key) return null;
  return (el as unknown as Record<string, MinimalFiber>)[key] ?? null;
}

function findDebugSource(fiber: MinimalFiber): MinimalFiber['_debugSource'] | null {
  let cur: MinimalFiber | undefined = fiber;
  while (cur) {
    if (cur._debugSource) return cur._debugSource;
    cur = cur._debugOwner ?? cur.return;
  }
  return null;
}

function findOwnerName(fiber: MinimalFiber): string | null {
  let cur: MinimalFiber | undefined = fiber;
  while (cur) {
    const t = cur.elementType ?? cur.type;
    const name = typeOfName(t);
    if (name && /^[A-Z]/.test(name)) return name;
    cur = cur._debugOwner ?? cur.return;
  }
  return null;
}

function typeOfName(t: unknown): string | null {
  if (!t) return null;
  if (typeof t === 'function') return (t as { displayName?: string; name?: string }).displayName ?? (t as { name?: string }).name ?? null;
  if (typeof t === 'object') return (t as { displayName?: string; name?: string }).displayName ?? null;
  return null;
}

function makeRelative(absolutePath: string, projectRoot: string): string {
  let p = absolutePath.replace(/\\/g, '/');
  const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '');
  if (p.startsWith(root + '/')) return p.slice(root.length + 1);
  // Fallback: keep only from the last common app-ish segment
  const m = p.match(/\/((?:app|components|lib|public)\/.+)$/);
  return m ? m[1] : p;
}

function buildCssPath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  for (let i = 0; cur && cur !== document.body && i < 4; i++) {
    let seg = cur.tagName.toLowerCase();
    if (cur.id) { seg += `#${cur.id}`; }
    else if (typeof cur.className === 'string' && cur.className.trim()) {
      const first = cur.className.trim().split(/\s+/)[0];
      if (first) seg += `.${first}`;
    }
    parts.unshift(seg);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}
