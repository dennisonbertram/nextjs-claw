'use client';
import { useState } from 'react';
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateEntry,
  type CategoryId,
} from '@/lib/templates-catalog';

interface Props {
  onPick: (prompt: string) => void;
}

export default function TemplatePicker({ onPick }: Props) {
  const [activeCat, setActiveCat] = useState<CategoryId>('popular');
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="group flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-800 py-2 text-xs text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300"
      >
        <span aria-hidden>▸</span>
        <span>Browse {TEMPLATES.length} templates</span>
      </button>
    );
  }

  const visible = TEMPLATES.filter(t =>
    activeCat === 'all' ? true : t.tags.includes(activeCat as Exclude<CategoryId, 'all'>),
  );

  return (
    <div>
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-200">Start with a template</h3>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Hide templates"
          title="Hide templates"
          className="-mr-1 -mt-1 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
        >
          ✕
        </button>
      </div>
      <p className="mb-2 text-xs text-neutral-500">Pick one, or describe your own below.</p>

      <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Template categories">
        {TEMPLATE_CATEGORIES.map(c => {
          const isActive = activeCat === c.id;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCat(c.id)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                isActive
                  ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-xs italic text-neutral-500">No templates in this category yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {visible.map(t => (
            <li key={t.slug}>
              <TemplateCard template={t} onPick={onPick} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onPick,
}: {
  template: TemplateEntry;
  onPick: (prompt: string) => void;
}) {
  const thumb = template.preview;
  return (
    <button
      onClick={() => onPick(template.prompt)}
      title={template.tagline}
      className="group relative block w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 text-left transition hover:border-indigo-500/60 hover:ring-1 hover:ring-indigo-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="relative aspect-[5/3] w-full overflow-hidden">
        {thumb.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb.src}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`h-full w-full ${thumb.className}`} aria-hidden />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" aria-hidden />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="text-xs font-semibold text-neutral-100 drop-shadow">{template.name}</p>
      </div>
    </button>
  );
}
