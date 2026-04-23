'use client';
import ToolChip from './ToolChip';
import type { ChatMessage } from '@/lib/use-agent-stream';

export default function MessageItem({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white">
        {message.text}
      </div>
    );
  }
  return (
    <div className="max-w-[95%] space-y-2 text-sm text-neutral-200">
      {message.parts.map((p, i) =>
        p.kind === 'text' ? (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">{p.text}</p>
        ) : (
          <ToolChip key={i} tool={p} />
        )
      )}
    </div>
  );
}
