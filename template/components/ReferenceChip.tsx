'use client';
import type { ElementRef } from '@/lib/react-source';

export default function ReferenceChip({ refData, onRemove }: { refData: ElementRef; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200">
      <span className="font-semibold uppercase tracking-wide">&lt;{refData.tagName.toLowerCase()}&gt;</span>
      {refData.textSnippet && <span className="truncate max-w-[140px] italic">&quot;{refData.textSnippet}&quot;</span>}
      <span className="font-mono text-indigo-300/70">{refData.fileName}:{refData.lineNumber}</span>
      <button
        onClick={onRemove}
        aria-label="Remove reference"
        className="ml-1 rounded text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-100 px-1"
      >×</button>
    </span>
  );
}
