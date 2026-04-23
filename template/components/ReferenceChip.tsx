'use client';
import type { ElementRef } from '@/lib/react-source';

const INK = '#1a1816';
const MUTED = '#6b6862';
const ACCENT = '#c2410c';
const ACCENT_SOFT = '#fdf1e8';

export default function ReferenceChip({
  refData,
  onRemove,
}: {
  refData: ElementRef;
  onRemove: () => void;
}) {
  const displayText =
    refData.text || refData.classes[0] || refData.domPath.split(' > ').pop() || '';
  const shortText = displayText.length > 32 ? displayText.slice(0, 32) + '…' : displayText;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
        padding: '4px 4px 4px 8px',
        borderRadius: 5,
        border: `1px solid ${ACCENT}55`,
        background: ACCENT_SOFT,
        fontSize: 11,
        fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
        color: INK,
      }}
    >
      <span
        style={{
          fontWeight: 600,
          color: ACCENT,
        }}
      >
        &lt;{refData.tagName}&gt;
      </span>
      {shortText && (
        <span
          style={{
            fontStyle: 'italic',
            color: INK,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 140,
          }}
        >
          &quot;{shortText}&quot;
        </span>
      )}
      {refData.componentChain && (
        <span style={{ color: MUTED }}>
          &middot; {refData.componentChain.split(' → ')[0]}
        </span>
      )}
      <button
        onClick={onRemove}
        aria-label="Remove reference"
        style={{
          marginLeft: 2,
          padding: '0 6px',
          borderRadius: 3,
          border: 'none',
          background: 'transparent',
          color: MUTED,
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1,
          fontFamily: 'inherit',
        }}
      >
        ✕
      </button>
    </span>
  );
}
