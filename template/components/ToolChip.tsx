'use client';
import type { ToolPart } from '@/lib/use-agent-stream';

// Human-readable label for the tool name (used as display text, not emoji)
const LABELS: Record<string, string> = {
  Read: 'read',
  Write: 'write',
  Edit: 'edit',
  Glob: 'find',
  Grep: 'grep',
  Bash: 'run',
  WebFetch: 'fetch',
  WebSearch: 'search',
  TodoWrite: 'todo',
};

const ACCENT = '#c2410c';
const GREEN  = '#16a34a';
const RED    = '#dc2626';
const LINE   = '#e2dbc9';
const SUBTLE = '#ece6d5';
const INK    = '#1a1816';

export default function ToolChip({ tool }: { tool: ToolPart }) {
  const label = LABELS[tool.name] ?? tool.name.toLowerCase();
  const state = tool.state;

  const stateColor =
    state === 'running' ? ACCENT :
    state === 'ok'      ? GREEN  :
                          RED;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: SUBTLE,
        border: `1px solid ${LINE}`,
        borderLeft: `3px solid ${stateColor}`,
        padding: '6px 10px 6px 8px',
        borderRadius: 5,
        fontSize: 11,
        fontFamily: 'var(--font-mono), JetBrains Mono, ui-monospace, monospace',
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      <span style={{ color: stateColor, fontWeight: 600 }}>{label}</span>
      {tool.target && (
        <span
          style={{
            color: INK,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 200,
          }}
        >
          {tool.target}
        </span>
      )}
      {state === 'running' && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: ACCENT,
            animation: 'claw-pulse 0.8s ease-in-out infinite',
            flexShrink: 0,
          }}
          aria-label="running"
        />
      )}
      {state === 'ok' && (
        <span style={{ color: GREEN, fontSize: 10 }} aria-label="done">✓</span>
      )}
      {state === 'err' && (
        <span style={{ color: RED, fontSize: 10 }} aria-label="failed">✕</span>
      )}
    </div>
  );
}
