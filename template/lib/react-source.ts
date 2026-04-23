export interface ElementRef {
  id: string;                  // crypto.randomUUID
  tagName: string;             // lowercase, e.g. "h1"
  text: string;                // trimmed innerText, first ~100 chars, collapsed whitespace
  classes: string[];           // split className.trim(); dedupe; keep order; drop Next/module hashes
  domPath: string;             // up to 4 levels of "tag.firstClass", joined " > ", ancestor → target
  ariaLabel?: string;          // getAttribute('aria-label') if present
  role?: string;               // getAttribute('role') if present
  href?: string;               // for <a> / <link> / <area>
  componentChain?: string;     // best-effort: walk Fiber.return, collect component names
}

// ─── public API ────────────────────────────────────────────────────────────

export function getElementRef(el: Element): ElementRef | null {
  const fiber = getFiber(el);
  // Return a ref even without fiber — DOM info is always available
  const rawText = ((el as HTMLElement).innerText ?? el.textContent ?? '').trim().replace(/\s+/g, ' ');
  const text = rawText.length > 100 ? rawText.slice(0, 100) + '…' : rawText;

  const rawClasses = typeof el.className === 'string'
    ? el.className.trim().split(/\s+/).filter(Boolean)
    : [];
  const classes = dedupeClasses(rawClasses.map(cleanClass).filter(Boolean));

  const ref: ElementRef = {
    id: crypto.randomUUID(),
    tagName: el.tagName.toLowerCase(),
    text,
    classes,
    domPath: buildDomPath(el),
  };

  const aria = el.getAttribute('aria-label');
  if (aria) ref.ariaLabel = aria;

  const role = el.getAttribute('role');
  if (role) ref.role = role;

  if (el.tagName === 'A' || el.tagName === 'LINK' || el.tagName === 'AREA') {
    const href = (el as HTMLAnchorElement).href || el.getAttribute('href');
    if (href) ref.href = href;
  }

  if (fiber) {
    const chain = buildComponentChain(fiber);
    if (chain) ref.componentChain = chain;
  }

  return ref;
}

// ─── internals ─────────────────────────────────────────────────────────────

interface MinimalFiber {
  return?: MinimalFiber;
  elementType?: unknown;
  type?: unknown;
}

function getFiber(el: Element): MinimalFiber | null {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
  if (!key) return null;
  return (el as unknown as Record<string, MinimalFiber>)[key] ?? null;
}

// Next.js / CSS module hash patterns to strip from class names
// e.g. "page_xyz123__abc" → "page", or "_hashonly" → drop
function cleanClass(cls: string): string {
  // Drop pure hash-looking classes (start with _ followed by hash chars)
  if (/^_[a-z0-9]{5,}$/.test(cls)) return '';
  // Strip trailing CSS module hash suffix: "moduleName_hash__suffix" → "moduleName"
  return cls.replace(/_[a-z0-9]{5,}(__[a-z0-9]+)?$/i, '').replace(/_+$/, '');
}

function dedupeClasses(classes: string[]): string[] {
  const seen = new Set<string>();
  return classes.filter(c => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

function isHashLooking(cls: string): boolean {
  // Very short, all caps, or looks like a hash
  if (cls.length <= 1) return true;
  if (/^[A-Z0-9_]+$/.test(cls) && cls.length <= 3) return true;
  if (/[0-9]{3,}/.test(cls)) return true;
  return false;
}

function pickFirstMeaningfulClass(el: Element): string {
  if (typeof el.className !== 'string') return '';
  const classes = el.className.trim().split(/\s+/).filter(Boolean);
  for (const cls of classes) {
    const cleaned = cleanClass(cls);
    if (cleaned && !isHashLooking(cleaned)) return cleaned;
  }
  return '';
}

function buildDomPath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  for (let i = 0; cur && cur !== document.body && cur !== document.documentElement && i < 4; i++) {
    const tag = cur.tagName.toLowerCase();
    const cls = pickFirstMeaningfulClass(cur);
    parts.unshift(cls ? `${tag}.${cls}` : tag);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

// Known Next.js framework internal component names — stop walking at these
const FRAMEWORK_INTERNALS = new Set([
  'InnerLayoutRouter', 'RenderFromTemplateContext', 'RedirectErrorBoundary',
  'RedirectBoundary', 'NotFoundErrorBoundary', 'NotFoundBoundary',
  'LoadingBoundary', 'ErrorBoundary', 'TemplateContext', 'AppRouter',
  'ServerInsertedHTMLProvider', 'StylesheetResource', 'ScriptResource',
  'ReactDOMServerRenderer', 'Suspense', 'SuspenseList', 'StrictMode',
  'Fragment', 'Profiler', 'Root',
]);

function typeOfName(t: unknown): string | null {
  if (!t) return null;
  if (typeof t === 'function') {
    return (t as { displayName?: string; name?: string }).displayName
      ?? (t as { name?: string }).name
      ?? null;
  }
  if (typeof t === 'object') {
    // Check for react.lazy: $$typeof is a Symbol; compare by description string
    const obj = t as Record<string, unknown>;
    const sym = obj.$$typeof;
    if (sym && sym.toString && sym.toString().includes('react.lazy')) {
      // Try to unwrap the lazy result
      const payload = obj._payload as Record<string, unknown> | undefined;
      const result = payload?._result as Record<string, unknown> | undefined;
      if (result) {
        return (result.displayName as string | undefined)
          ?? (result.name as string | undefined)
          ?? null;
      }
      return null;
    }
    return (obj.displayName as string | undefined) ?? null;
  }
  return null;
}

function buildComponentChain(fiber: MinimalFiber): string | undefined {
  const names: string[] = [];
  let cur: MinimalFiber | undefined = fiber;
  let depth = 0;

  while (cur && depth < 15) {
    depth++;
    const t = cur.elementType ?? cur.type;
    const name = typeOfName(t);
    if (name && /^[A-Z]/.test(name)) {
      if (FRAMEWORK_INTERNALS.has(name)) break;
      if (!names.includes(name)) names.push(name);
    }
    cur = cur.return;
  }

  return names.length > 0 ? names.join(' → ') : undefined;
}
