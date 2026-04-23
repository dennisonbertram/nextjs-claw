'use client';
import MessageList from './MessageList';
import Composer from './Composer';
import HealthBanner from './HealthBanner';
import type { ChatMessage } from '@/lib/use-agent-stream';

interface Props {
  onClose: () => void;
  health: { ok: boolean; hint?: string } | null;
  messages: ChatMessage[];
  running: boolean;
  sessionId?: string;
  onSend: (prompt: string) => void;
  onStop: () => void;
}

export default function ChatPanel({ onClose, health, messages, running, onSend, onStop }: Props) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Build this app</h2>
          <p className="text-xs text-neutral-400">Describe what you want. I&apos;ll edit the code.</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
        >
          ✕
        </button>
      </header>
      {health && !health.ok && <HealthBanner hint={health.hint} />}
      <MessageList messages={messages} running={running} />
      <Composer
        disabled={health ? !health.ok : false}
        running={running}
        onSend={onSend}
        onStop={onStop}
      />
    </div>
  );
}
