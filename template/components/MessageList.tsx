'use client';
import { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import TemplatePicker from './TemplatePicker';
import type { ChatMessage } from '@/lib/use-agent-stream';

interface Props {
  messages: ChatMessage[];
  running: boolean;
  onQuickPrompt: (prompt: string) => void;
}

export default function MessageList({ messages, running, onQuickPrompt }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, running]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <TemplatePicker onPick={onQuickPrompt} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {messages.map((m, i) => (
          <li key={i}>
            <MessageItem
              message={m}
              isLast={i === messages.length - 1}
              running={running}
            />
          </li>
        ))}
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
