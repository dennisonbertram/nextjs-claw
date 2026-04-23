'use client';
import { TEMPLATES, type TemplateEntry } from '@/lib/templates-catalog';

interface Props {
  onPick: (prompt: string) => void;
}

export default function TemplatePicker({ onPick }: Props) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-neutral-200">Start with a template</h3>
      <p className="mb-3 text-xs text-neutral-500">Pick one to get going, or describe your own idea below.</p>
      <ul className="grid grid-cols-2 gap-2">
        {TEMPLATES.map(t => (
          <li key={t.slug}>
            <TemplateCard template={t} onPick={onPick} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TemplateCard({ template, onPick }: { template: TemplateEntry; onPick: (prompt: string) => void }) {
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
