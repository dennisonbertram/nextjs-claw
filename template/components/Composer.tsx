'use client';
import { useState, useRef, FormEvent, KeyboardEvent } from 'react';
import ReferenceChip from './ReferenceChip';
import type { ElementRef } from '@/lib/react-source';

interface Props {
  disabled?: boolean;
  running: boolean;
  onSend: (prompt: string, refs?: ElementRef[]) => void;
  onStop: () => void;
  references: ElementRef[];
  onRemoveReference: (id: string) => void;
}

const ACCENT = '#c2410c';
const INK    = '#1a1816';
const MUTED  = '#6b6862';
const LINE   = '#e2dbc9';

export default function Composer({ disabled, running, onSend, onStop, references, onRemoveReference }: Props) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || running || disabled) return;
    onSend(v, references.length > 0 ? references : undefined);
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <form
      onSubmit={submit}
      style={{
        flexShrink: 0,
        padding: '10px 14px 14px',
        borderTop: `1px solid ${LINE}`,
      }}
    >
      {/* Reference chips */}
      {references.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {references.map(r => (
            <ReferenceChip key={r.id} refData={r} onRemove={() => onRemoveReference(r.id)} />
          ))}
        </div>
      )}

      {/* Composer box */}
      <div
        style={{
          background: '#fffdf6',
          border: `1px solid ${LINE}`,
          borderRadius: 10,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={
            disabled  ? 'Install Claude Code to chat…' :
            running   ? 'Claude is working…' :
                        'Describe what to build, or paste a design.'
          }
          rows={2}
          disabled={disabled}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            resize: 'none',
            color: INK,
            fontSize: 13,
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Ghost icon row */}
          <div style={{ display: 'flex', gap: 4 }}>
            {/* Paperclip */}
            <button
              type="button"
              title="Attach file"
              style={{ background: 'none', border: 'none', color: MUTED, width: 22, height: 22, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 6L6.5 9.5a2 2 0 01-3-3L8 2a3 3 0 014 4l-5 5" />
              </svg>
            </button>
            {/* Plus circle */}
            <button
              type="button"
              title="Add context"
              style={{ background: 'none', border: 'none', color: MUTED, width: 22, height: 22, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="5" />
                <path d="M5 7h4M7 5v4" />
              </svg>
            </button>
            {/* Hash */}
            <button
              type="button"
              title="Reference"
              style={{ background: 'none', border: 'none', color: MUTED, width: 22, height: 22, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h10M2 7h10M2 10h6" />
              </svg>
            </button>
          </div>

          {/* Send / Stop */}
          {running ? (
            <button
              type="button"
              onClick={onStop}
              style={{
                background: 'transparent',
                color: INK,
                border: `1px solid ${LINE}`,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, background: INK, borderRadius: 1, display: 'inline-block' }} />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !text.trim()}
              style={{
                background: disabled || !text.trim() ? '#e2dbc9' : ACCENT,
                color: '#fff',
                border: 'none',
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 150ms',
              }}
            >
              Build ↵
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
