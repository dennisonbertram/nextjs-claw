'use client';
import { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import type { ChatMessage } from '@/lib/use-agent-stream';

export default function MessageList({ messages, running }: { messages: ChatMessage[]; running: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, running]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="space-y-3 text-sm text-neutral-400">
          <p>Try:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Change the hero title to &ldquo;Hello, Claude&rdquo;</li>
            <li>Add a pricing section with three tiers</li>
            <li>Make this a SaaS dashboard with a sidebar</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <ol className="space-y-4">
        {messages.map((m, i) => (
          <li key={i}>
            <MessageItem message={m} />
          </li>
        ))}
      </ol>
      <div ref={bottomRef} />
    </div>
  );
}
