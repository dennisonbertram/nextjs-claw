'use client';
import { useState, useRef, FormEvent, KeyboardEvent } from 'react';

interface Props {
  disabled?: boolean;
  running: boolean;
  onSend: (prompt: string) => void;
  onStop: () => void;
}

export default function Composer({ disabled, running, onSend, onStop }: Props) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || running || disabled) return;
    onSend(v);
    setText('');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <form onSubmit={submit} className="border-t border-neutral-800 p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={disabled ? 'Install Claude Code to chat…' : 'Describe what to build…'}
          rows={2}
          disabled={disabled}
          className="flex-1 resize-none rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        {running ? (
          <button type="button" onClick={onStop}
            className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500">
            Stop
          </button>
        ) : (
          <button type="submit" disabled={disabled || !text.trim()}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">
            Send
          </button>
        )}
      </div>
    </form>
  );
}
