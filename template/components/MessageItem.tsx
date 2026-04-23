'use client';
import ToolChip from './ToolChip';
import InfiniteLogo from './InfiniteLogo';
import type { ChatMessage } from '@/lib/use-agent-stream';

const INK  = '#1a1816';
const BG   = '#faf7f2';

export default function MessageItem({ message, isLast, running }: { message: ChatMessage; isLast?: boolean; running?: boolean }) {
  if (message.role === 'user') {
    return (
      <div
        style={{
          marginLeft: 'auto',
          maxWidth: '88%',
          background: INK,
          color: BG,
          padding: '9px 13px',
          borderRadius: 14,
          borderBottomRightRadius: 4,
          fontSize: 13,
          lineHeight: 1.5,
          width: 'fit-content',
        }}
      >
        {message.text}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, maxWidth: '95%' }}>
      <InfiniteLogo size="avatar" />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 2 }}>
        {message.parts.map((p, i) =>
          p.kind === 'text' ? (
            <p
              key={i}
              style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: INK, whiteSpace: 'pre-wrap' }}
            >
              {p.text}
            </p>
          ) : (
            <ToolChip key={i} tool={p} />
          )
        )}
        {running && isLast && (
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 14,
              background: '#c2410c',
              animation: 'claw-cursor 1s steps(2) infinite',
            }}
          />
        )}
      </div>
    </div>
  );
}
