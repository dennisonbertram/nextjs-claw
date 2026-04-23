'use client';
import type { ToolPart } from '@/lib/use-agent-stream';

const ICONS: Record<string, string> = {
  Read: '📖', Write: '✍️', Edit: '✏️', Glob: '🔎', Grep: '🔍',
  Bash: '▶️', WebFetch: '🌐', WebSearch: '🌐', TodoWrite: '📋',
};

export default function ToolChip({ tool }: { tool: ToolPart }) {
  const icon = ICONS[tool.name] ?? '🔧';
  const state = tool.state;
  const border =
    state === 'running' ? 'border-indigo-500/60' :
    state === 'ok'      ? 'border-emerald-500/40' :
                          'border-rose-500/60';
  return (
    <div className={`inline-flex items-center gap-2 rounded-md border ${border} bg-neutral-900 px-2 py-1 text-xs`}>
      <span aria-hidden="true">{icon}</span>
      <span className="font-medium text-neutral-200">{tool.name}</span>
      {tool.target && <span className="truncate font-mono text-neutral-400 max-w-[200px]">{tool.target}</span>}
      {state === 'running' && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-400" aria-label="running" />}
      {state === 'ok' && <span aria-label="done">✓</span>}
      {state === 'err' && <span aria-label="failed">✕</span>}
    </div>
  );
}
