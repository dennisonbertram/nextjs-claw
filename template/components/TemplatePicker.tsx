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

const INK    = '#1a1816';
const MUTED  = '#6b6862';
const LINE   = '#e2dbc9';
const SUBTLE = '#ece6d5';
const ACCENT = '#c2410c';
const ACCENT_SOFT = '#fdf1e8';

export default function TemplatePicker({ onPick }: Props) {
  const [activeCat, setActiveCat] = useState<CategoryId>('popular');
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderRadius: 6,
          border: `1px dashed ${LINE}`,
          padding: '8px 0',
          fontSize: 12,
          color: MUTED,
          background: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 150ms, color 150ms',
        }}
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
      {/* Header */}
      <div style={{ marginBottom: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: INK }}>Start with a template</h3>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Hide templates"
          title="Hide templates"
          style={{
            background: 'none',
            border: 'none',
            color: MUTED,
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 12,
            marginTop: -2,
            marginRight: -4,
          }}
        >
          ✕
        </button>
      </div>
      <p style={{ marginTop: 0, marginBottom: 8, fontSize: 12, color: MUTED }}>
        Pick one, or describe your own below.
      </p>

      {/* Category filter chips */}
      <div
        style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}
        role="tablist"
        aria-label="Template categories"
      >
        {TEMPLATE_CATEGORIES.map(c => {
          const isActive = activeCat === c.id;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCat(c.id)}
              style={{
                borderRadius: 999,
                padding: '2px 10px',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: isActive ? ACCENT_SOFT : 'none',
                color: isActive ? ACCENT : MUTED,
                border: `1px solid ${isActive ? ACCENT + '55' : 'transparent'}`,
                transition: 'background 150ms, color 150ms',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Template grid */}
      {visible.length === 0 ? (
        <p style={{ fontSize: 12, color: MUTED, fontStyle: 'italic' }}>No templates in this category yet.</p>
      ) : (
        <ul style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 0, margin: 0, listStyle: 'none' }}>
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
      style={{
        display: 'block',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 6,
        border: `1px solid ${LINE}`,
        background: SUBTLE,
        textAlign: 'left',
        cursor: 'pointer',
        padding: 0,
        transition: 'border-color 150ms',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '5/3', width: '100%', overflow: 'hidden' }}>
        {thumb.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb.src}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
          />
        ) : (
          <div className={`h-full w-full ${thumb.className}`} aria-hidden />
        )}
        <div
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)',
          }}
          aria-hidden
        />
      </div>
      <div style={{ position: 'absolute', inset: '0 0 0 0', bottom: 0, padding: 8, display: 'flex', alignItems: 'flex-end' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#f5f5f5', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          {template.name}
        </p>
      </div>
    </button>
  );
}
