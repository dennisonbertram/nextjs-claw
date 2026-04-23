'use client';
import MessageList from './MessageList';
import Composer from './Composer';
import HealthBanner from './HealthBanner';
import type { ChatMessage } from '@/lib/use-agent-stream';
import type { ElementRef } from '@/lib/react-source';

interface Props {
  onClose: () => void;
  health: { ok: boolean; hint?: string } | null;
  messages: ChatMessage[];
  running: boolean;
  sessionId?: string;
  onSend: (prompt: string, refs?: ElementRef[]) => void;
  onStop: () => void;
  pickMode: boolean;
  onTogglePick: () => void;
  references: ElementRef[];
  onRemoveReference: (id: string) => void;
}

export default function ChatPanel({
  onClose, health, messages, running, onSend, onStop,
  pickMode, onTogglePick, references, onRemoveReference,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Build this app</h2>
          <p className="text-xs text-neutral-400">Describe what you want. I&apos;ll edit the code.</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePick}
            aria-pressed={pickMode}
            aria-label="Toggle pick mode"
            className={`rounded p-1.5 text-xs hover:bg-neutral-800 ${pickMode ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40' : 'text-neutral-400'}`}
            title="Pick element (P)"
          >
            ⌖ Pick
          </button>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>
      </header>
      {health && !health.ok && <HealthBanner hint={health.hint} />}
      <MessageList messages={messages} running={running} />
      <Composer
        disabled={health ? !health.ok : false}
        running={running}
        onSend={onSend}
        onStop={onStop}
        references={references}
        onRemoveReference={onRemoveReference}
      />
    </div>
  );
}
