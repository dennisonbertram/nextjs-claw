'use client';
import type { ElementRef } from '@/lib/react-source';

export default function ReferenceChip({ refData, onRemove }: { refData: ElementRef; onRemove: () => void }) {
  // If text is empty, fall back to first class or domPath tail
  const displayText = refData.text
    || refData.classes[0]
    || refData.domPath.split(' > ').pop()
    || '';

  const shortText = displayText.length > 32 ? displayText.slice(0, 32) + '…' : displayText;

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200">
      <span className="rounded bg-indigo-500/20 px-1 font-semibold text-indigo-300 ring-1 ring-indigo-500/40">
        &lt;{refData.tagName}&gt;
      </span>
      {shortText && (
        <span className="truncate max-w-[140px] italic">&quot;{shortText}&quot;</span>
      )}
      {refData.componentChain && (
        <span className="text-indigo-400/60">&middot; {refData.componentChain.split(' → ')[0]}</span>
      )}
      <button
        onClick={onRemove}
        aria-label="Remove reference"
        className="ml-1 rounded text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-100 px-1"
      >✕</button>
    </span>
  );
}
